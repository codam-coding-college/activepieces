import { createAction } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { recordParamsUtils } from '../common/record-params';
import { twentyRecordProps } from '../common/record-props';
import { twentyApi } from '../common/api';
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
      props: ['fields', 'values'],
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
    rewrite: twentyRecordProps.rewrite({ required: false }),
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

    const record = recordParamsUtils.toRecordValues({ values: values ?? {} });
    if (Object.keys(record).length === 0)
      return await twentyApi.getRecord({
        auth: context.auth,
        objectNamePlural: object.namePlural,
        recordId,
      });

    return await twentyApi.updateRecord({
      auth: context.auth,
      objectNamePlural: object.namePlural,
      recordId,
      record,
      appendArrays: !rewrite,
    });
  },
});
