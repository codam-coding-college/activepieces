import { createAction } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { recordParamsUtils } from '../common/record-params';
import { twentyRecordProps } from '../common/record-props';
import { twentyMetadataUtils } from '../common/metadata';

export const createRecord = createAction({
  auth: twentyAuth,
  name: 'createRecord',
  displayName: 'Create Record',
  classification: 'WRITE',
  description: 'Creates a record of any object in Twenty CRM.',
  propertyGroups: [
    {
      key: 'search',
      display: 'section',
      label: 'Object',
      icon: 'tag',
      props: ['object'],
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
    object: twentyRecordProps.object({ required: true }),
    fields: twentyRecordProps.fields({
      displayName: 'Selected Fields',
      description: 'The fields to set on the new record.',
      required: true,
      purpose: 'write',
    }),
    values: twentyRecordProps.values({
      displayName: 'Values',
      required: false,
    }),
  },
  async run(context) {
    const { object, values } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(object))
      throw new Error('Select an object.');

    return await twentyApi.createCustomObject({
      auth: context.auth,
      objectNamePlural: object.namePlural,
      record: recordParamsUtils.toRecordValues({ values: values ?? {} }),
    });
  },
});
