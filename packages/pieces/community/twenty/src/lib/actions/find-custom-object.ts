import { createAction } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { customObjectParamsUtils } from '../common/custom-object-params';
import { twentyCustomObjectProps } from '../common/custom-object-props';
import { twentyMetadataUtils } from '../common/metadata';

export const findCustomObject = createAction({
  auth: twentyAuth,
  name: 'findCustomObject',
  displayName: 'Find Custom Object',
  description: 'Finds custom object records in Twenty CRM.',
  classification: 'SEARCH',
  propertyGroups: [
    {
      key: 'search',
      display: 'section',
      label: 'Custom Object',
      icon: 'tag',
      props: ['customObject'],
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
    customObject: twentyCustomObjectProps.object({
      required: true,
      description:
        'The type of record to search, e.g. People, Companies or one of your custom objects.',
    }),
    fields: twentyCustomObjectProps.fields({
      required: true,
      displayName: 'Filter By',
      description: 'The fields to filter on.',
    }),
    filters: twentyCustomObjectProps.filters({ required: false }),
  },
  async run(context) {
    const { customObject, filters } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(customObject))
      throw new Error('Select a custom object type.');

    return await twentyApi.findCustomObject({
      auth: context.auth,
      objectNamePlural: customObject.namePlural,
      conditions: customObjectParamsUtils.toFilterConditions({
        conditions: filters ?? {},
      }),
    });
  },
});
