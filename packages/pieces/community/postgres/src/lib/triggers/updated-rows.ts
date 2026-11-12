import {
  createTrigger,
  TriggerStrategy,
  AppConnectionValueForAuthProperty,
  StaticPropsValue,
  Property,
  MarkdownVariant,
} from '@activepieces/pieces-framework';
import {
  DedupeStrategy,
  Polling,
  pollingHelper,
} from '@activepieces/pieces-common';
import { pgClient, postgresCommon, postgresUtils } from '../common';
import format from 'pg-format';
import { postgresAuth } from '../auth';

const props = {
  description: Property.MarkDown({
    value:
      'Each check returns every row whose timestamp is newer than the last check. The table needs a column that is set to the current time whenever a row changes, such as `updated_at`.',
    variant: MarkdownVariant.INFO,
  }),
  table: postgresCommon.table,
  column: Property.Dropdown<string, true, typeof postgresAuth>({
    auth: postgresAuth,
    displayName: 'Updated At Column',
    description:
      'The timestamp column that records when a row was last changed. Only timestamp columns are listed. Columns without a time zone are read as UTC.',
    required: true,
    refreshers: ['table'],
    options: async ({ auth, table }) => {
      if (!auth) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please authenticate first',
        };
      }
      if (!postgresUtils.isPostgresTable(table)) {
        return {
          disabled: true,
          options: [],
          placeholder: 'Please select a table',
        };
      }
      const client = await pgClient(auth);
      try {
        const columns = await postgresUtils.listDateColumns({ client, table });
        const options = columns.map((column) => ({
          label: column,
          value: column,
        }));

        if (options.length === 0)
          return {
            disabled: true,
            options: [],
            placeholder: 'This table has no timestamp columns',
          };
        return {
          disabled: false,
          options,
        };
      } finally {
        await client.end();
      }
    },
  }),
};

const polling: Polling<
  AppConnectionValueForAuthProperty<typeof postgresAuth>,
  StaticPropsValue<typeof props>
> = {
  strategy: DedupeStrategy.TIMEBASED,
  items: async ({ auth, propsValue, lastFetchEpochMS }) => {
    const client = await pgClient(auth);
    const { table, column } = propsValue;
    try {
      await client.query("SET TIME ZONE 'UTC'");
      const query = format(
        'SELECT *, (EXTRACT(EPOCH FROM %I) * 1000)::float8 AS %I FROM %I.%I WHERE %I > to_timestamp($1::float8 / 1000) ORDER BY %I DESC',
        column,
        EPOCH_ALIAS,
        table.table_schema,
        table.table_name,
        column,
        column
      );
      const result = await client.query<Record<string, unknown>>(query, [
        lastFetchEpochMS,
      ]);
      if (result.rows.length === 0) return [];

      const newest = Number(result.rows[0][EPOCH_ALIAS]);
      const rows = result.rows.map(withoutEpoch);
      return [
        {
          epochMilliSeconds: newest,
          data: { rows, rowCount: rows.length },
        },
      ];
    } finally {
      await client.end();
    }
  },
};

function withoutEpoch(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => key !== EPOCH_ALIAS)
  );
}

const EPOCH_ALIAS = '__ap_updated_epoch_ms';

export const updatedRows = createTrigger({
  name: 'updatedRows',
  classification: 'READ',
  auth: postgresAuth,
  displayName: 'Updated Rows',
  description: 'Triggers when rows in a table are updated',
  aiMetadata: {
    description:
      'Fires when one or more rows in a selected PostgreSQL table change, detected by polling a timestamp column (such as updated_at) for values newer than the previous check. Each event carries every row changed since the last check as a single list, plus the number of rows.',
  },
  props,
  propertyGroups: [
    {
      key: 'table',
      display: 'section',
      label: 'What to watch',
      icon: 'inbox',
      props: ['table'],
    },
    {
      key: 'change',
      display: 'section',
      label: 'Finding updated rows',
      icon: 'sliders',
      props: ['description', 'column'],
    },
  ],
  sampleData: {
    rows: [
      {
        id: 42,
        name: 'Jane Doe',
        email: 'jane@example.com',
        updated_at: '2026-01-15T10:30:00.000Z',
      },
    ],
    rowCount: 1,
  },
  type: TriggerStrategy.POLLING,
  async test(context) {
    return await pollingHelper.test(polling, context);
  },
  async onEnable(context) {
    await pollingHelper.onEnable(polling, context);
  },

  async onDisable(context) {
    await pollingHelper.onDisable(polling, context);
  },

  async run(context) {
    return await pollingHelper.poll(polling, context);
  },
});
