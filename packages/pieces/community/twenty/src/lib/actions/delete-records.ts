import { createAction } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { twentyMetadataUtils } from '../common/metadata';
import { recordParamsUtils } from '../common/record-params';
import { twentyRecordProps } from '../common/record-props';

export const deleteRecords = createAction({
  auth: twentyAuth,
  name: 'deleteRecords',
  displayName: 'Delete Records',
  description:
    'Moves the records matching the filters to the trash, where they can be restored.',
  aiMetadata: {
    description:
      'Moves every record of the selected object in Twenty CRM that matches all given filters to the trash (soft delete), where it can still be restored. Fails when no filter is set, so it never deletes a whole object by accident. Returns the deleted records. Not idempotent: a repeat call deletes whatever matches at that moment.',
    idempotent: false,
  },
  classification: 'WRITE',
  propertyGroups: [
    {
      key: 'object',
      display: 'section',
      label: 'Object',
      icon: 'tag',
      props: ['object'],
    },
    {
      key: 'filters',
      display: 'section',
      label: 'Filter Fields',
      icon: 'filter',
      props: ['fields', 'filters'],
    },
  ],
  props: {
    object: twentyRecordProps.object({
      required: true,
      description:
        'The type of record to delete, e.g. People, Companies or one of your custom objects.',
    }),
    fields: twentyRecordProps.fields({
      required: true,
      displayName: 'Delete Where',
      description: 'The fields used to find the records to delete.',
    }),
    filters: twentyRecordProps.filters({ required: true }),
  },
  async run(context) {
    const { object, filters } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(object))
      throw new Error('Select an object.');

    const conditions = recordParamsUtils.parseQueryConditions({
      input: filters ?? {},
    });
    if (conditions.length === 0)
      throw new Error('Set at least one filter to match records on.');

    return await twentyApi.deleteRecords({
      auth: context.auth,
      objectNamePlural: object.namePlural,
      conditions,
    });
  },
});
