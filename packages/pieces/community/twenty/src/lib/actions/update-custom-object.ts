import { createAction, Property } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { customObjectParamsUtils } from '../common/custom-object-params';
import { twentyCustomObjectProps } from '../common/custom-object-props';
import { twentyMetadataUtils } from '../common/metadata';

export const updateCustomObject = createAction({
  auth: twentyAuth,
  name: 'updateCustomObject',
  displayName: 'Update Custom Object',
  classification: 'WRITE',
  description: 'Updates a custom object record in Twenty CRM.',
  propertyGroups: [
    {
      key: 'search',
      display: 'section',
      label: 'Custom Object',
      icon: 'tag',
      props: ['customObject', 'recordId'],
    },
    {
      key: 'fields',
      display: 'section',
      label: 'Field',
      icon: 'tag',
      props: ['fields'],
    },
    {
      key: 'settings',
      display: 'section',
      label: 'Settings',
      icon: 'settings',
      props: ['rewrite'],
    },
  ],
  props: {
    customObject: twentyCustomObjectProps.object({ required: true }),
    recordId: twentyCustomObjectProps.recordId({ required: true }),
    rewrite: Property.Checkbox({
      required: false,
      displayName: 'Rewrite array fields',
      description:
        'Replace list fields instead of adding the new values to them.',
      defaultValue: false,
    }),
    fields: twentyCustomObjectProps.fields({
      displayName: 'Selected Fields',
      description: 'The fields to change on the record.',
      required: true,
      purpose: 'write',
    }),
    values: twentyCustomObjectProps.values({
      displayName: 'Updates',
      required: false,
    }),
  },
  async run(context) {
    const { customObject, recordId, rewrite, values } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(customObject))
      throw new Error('Select a custom object type.');

    return await twentyApi.updateCustomObject({
      auth: context.auth,
      objectNamePlural: customObject.namePlural,
      recordId,
      record: customObjectParamsUtils.toRecordValues({ values: values ?? {} }),
      replaceArrays: rewrite ?? false,
    });
  },
});
