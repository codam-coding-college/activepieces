import { createAction } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { recordParamsUtils } from '../common/record-params';
import { twentyRecordProps } from '../common/record-props';
import { twentyMetadataUtils } from '../common/metadata';

export const findRecords = createAction({
  auth: twentyAuth,
  name: 'findRecords',
  displayName: 'Find Records',
  description: 'Finds records of any object in Twenty CRM.',
  classification: 'SEARCH',
  propertyGroups: [
    {
      key: 'search',
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
      props: ['fields'],
    },
  ],
  props: {
    object: twentyRecordProps.object({
      required: true,
      description:
        'The type of record to search, e.g. People, Companies or one of your custom objects.',
    }),
    fields: twentyRecordProps.fields({
      required: true,
      displayName: 'Filter By',
      description: 'The fields to filter on.',
    }),
    filters: twentyRecordProps.filters({ required: false }),
  },
  async run(context) {
    const { object, filters } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(object))
      throw new Error('Select an object.');

    return await twentyApi.findCustomObject({
      auth: context.auth,
      objectNamePlural: object.namePlural,
      conditions: recordParamsUtils.toFilterConditions({
        conditions: filters ?? {},
      }),
    });
  },
});
