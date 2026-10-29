import { createAction, Property } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { recordParamsUtils } from '../common/record-params';
import { twentyRecordProps } from '../common/record-props';
import { twentyMetadataUtils } from '../common/metadata';

export const updateRecord = createAction({
  auth: twentyAuth,
  name: 'updateRecord',
  displayName: 'Update Record',
  classification: 'WRITE',
  description: 'Updates a record of any object in Twenty CRM.',
  propertyGroups: [
    {
      key: 'search',
      display: 'section',
      label: 'Object',
      icon: 'tag',
      props: ['object', 'recordId'],
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
    object: twentyRecordProps.object({ required: true }),
    recordId: twentyRecordProps.recordId({ required: true }),
    rewrite: Property.Checkbox({
      required: false,
      displayName: 'Rewrite array fields',
      description:
        'Replace list fields instead of adding the new values to them.',
      defaultValue: false,
    }),
    fields: twentyRecordProps.fields({
      displayName: 'Selected Fields',
      description: 'The fields to change on the record.',
      required: true,
      purpose: 'write',
    }),
    values: twentyRecordProps.values({
      displayName: 'Updates',
      required: false,
    }),
  },
  async run(context) {
    const { object, recordId, rewrite, values } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(object))
      throw new Error('Select an object.');

    return await twentyApi.updateCustomObject({
      auth: context.auth,
      objectNamePlural: object.namePlural,
      recordId,
      record: recordParamsUtils.toRecordValues({ values: values ?? {} }),
      replaceArrays: rewrite ?? false,
    });
  },
});
