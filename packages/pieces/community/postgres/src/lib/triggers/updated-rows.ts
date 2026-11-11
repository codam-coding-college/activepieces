import {
  createTrigger,
  TriggerStrategy,
  AppConnectionValueForAuthProperty,
  StaticPropsValue,
  Property,
} from '@activepieces/pieces-framework';
import {
  DedupeStrategy,
  Polling,
  pollingHelper,
} from '@activepieces/pieces-common';
import dayjs from 'dayjs';
import { pgClient, postgresCommon, postgresUtils } from '../common';
import format from 'pg-format';
import { postgresAuth } from '../auth';

const props = {
  table: postgresCommon.table,
  column: Property.Dropdown<string, true, typeof postgresAuth>({
    auth: postgresAuth,
    displayName: 'Column',
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
            placeholder: 'Please select a table with a timestamp value.',
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
      const query = format(
        'SELECT * FROM %I.%I WHERE %I > $1 ORDER BY %I DESC',
        table.table_schema,
        table.table_name,
        column,
        column
      );
      const result = await client.query(query, [new Date(lastFetchEpochMS)]);
      if (result.rowCount === 0) return [];

      const newest = dayjs(result.rows[0][column]).valueOf();
      return [
        {
          epochMilliSeconds: newest,
          data: { rows: result.rows, rowCount: result.rowCount },
        },
      ];
    } finally {
      await client.end();
    }
  },
};

export const updatedRows = createTrigger({
  name: 'updatedRows',
  classification: 'READ',
  auth: postgresAuth,
  displayName: 'Updated Rows',
  description: 'triggers when a row in a table is updated.',
  props,
  propertyGroups: [
    {
      key: 'table',
      display: 'section',
      label: 'What to watch',
      icon: 'inbox',
      props: ['table', 'column'],
    },
  ],
  sampleData: {},
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
