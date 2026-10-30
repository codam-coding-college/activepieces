import { createAction, Property } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { twentyMetadataUtils } from '../common/metadata';
import { recordParamsUtils } from '../common/record-params';
import { twentyRecordProps } from '../common/record-props';
import {
  FilterCondition,
  TwentyAuthValue,
  TwentyRecord,
} from '../common/types';

export const createOrUpdateRecord = createAction({
  auth: twentyAuth,
  name: 'createOrUpdateRecord',
  displayName: 'Create or Update Record',
  description:
    'Updates the records matching the filters, or creates a new record when none match.',
  classification: 'WRITE',
  propertyGroups: [
    {
      key: 'search',
      display: 'section',
      label: 'Object',
      icon: 'tag',
      props: ['object', 'searchFields', 'filters'],
    },
    {
      key: 'fields',
      display: 'section',
      label: 'Field',
      icon: 'tag',
      props: ['updateFields', 'values'],
    },
    {
      key: 'settings',
      display: 'section',
      label: 'Settings',
      icon: 'settings',
      props: ['updateAll'],
    },
  ],
  props: {
    object: twentyRecordProps.object({ required: true }),
    searchFields: twentyRecordProps.fields({
      required: true,
      displayName: 'Match On',
      description: 'The fields used to find the records to update.',
    }),
    filters: twentyRecordProps.filters({
      required: true,
      fieldsProp: 'searchFields',
    }),
    updateAll: Property.Checkbox({
      required: false,
      displayName: 'Update all matching records',
      description:
        'Update every record that matches. When unchecked, only the first match is updated.',
      defaultValue: true,
    }),
    updateFields: twentyRecordProps.fields({
      required: true,
      displayName: 'Selected Fields',
      description: 'The fields to set on the record.',
      purpose: 'write',
    }),
    values: twentyRecordProps.values({
      displayName: 'Values',
      fieldsProp: 'updateFields',
      required: false,
    }),
  },
  async run(context) {
    const { object, filters, values, updateAll } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(object))
      throw new Error('Select an object.');

    const conditions = recordParamsUtils.toFilterConditions({
      conditions: filters ?? {},
    });
    if (conditions.length === 0)
      throw new Error('Set at least one filter to match records on.');

    const record = recordParamsUtils.toRecordValues({ values: values ?? {} });
    const params = {
      auth: context.auth,
      objectNamePlural: object.namePlural,
      conditions,
      record,
    };

    const updated = updateAll
      ? await twentyApi.updateRecords(params)
      : await updateFirstMatch(params);
    if (updated.length > 0) return { action: 'updated', records: updated };

    const created = await twentyApi.createRecord({
      auth: context.auth,
      objectNamePlural: object.namePlural,
      record,
    });
    return { action: 'created', records: created ? [created] : [] };
  },
});

async function updateFirstMatch({
  auth,
  objectNamePlural,
  conditions,
  record,
}: {
  auth: TwentyAuthValue;
  objectNamePlural: string;
  conditions: FilterCondition[];
  record: Record<string, unknown>;
}): Promise<TwentyRecord[]> {
  const [first] = await twentyApi.findRecords({
    auth,
    objectNamePlural,
    conditions,
  });
  if (!first?.id) return [];

  const updated = await twentyApi.updateRecord({
    auth,
    objectNamePlural,
    recordId: first.id,
    record,
  });
  return updated ? [updated] : [];
}
