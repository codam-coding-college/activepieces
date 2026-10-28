import { createAction } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { customObjectParamsUtils } from '../common/custom-object-params';
import { twentyCustomObjectProps } from '../common/custom-object-props';
import { twentyMetadataUtils } from '../common/metadata';

export const createCustomObject = createAction({
  auth: twentyAuth,
  name: 'createCustomObject',
  displayName: 'Create Custom Object',
  classification: 'WRITE',
  description: 'Creates a custom object record in Twenty CRM.',
  propertyGroups: [
    {
      key: 'search',
      display: 'section',
      label: 'Custom Object',
      icon: 'tag',
      props: ['customObject'],
    },
    {
      key: 'fields',
      display: 'section',
      label: 'Field',
      icon: 'tag',
      props: ['fields'],
    },
  ],
  props: {
    customObject: twentyCustomObjectProps.object({ required: true }),
    fields: twentyCustomObjectProps.fields({
      displayName: 'Selected Fields',
      description: 'The fields to set on the new record.',
      required: true,
      purpose: 'write',
    }),
    values: twentyCustomObjectProps.values({
      displayName: 'Values',
      required: false,
    }),
  },
  async run(context) {
    const { customObject, values } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(customObject))
      throw new Error('Select a custom object type.');

    return await twentyApi.createCustomObject({
      auth: context.auth,
      objectNamePlural: customObject.namePlural,
      record: customObjectParamsUtils.toRecordValues({ values: values ?? {} }),
    });
  },
});
