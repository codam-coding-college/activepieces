import { createAction } from '@activepieces/pieces-framework';
import { twentyAuth } from '../auth';
import { twentyApi } from '../common/api';
import { twentyMetadataUtils } from '../common/metadata';
import { twentyRecordProps } from '../common/record-props';

export const emptyTrash = createAction({
  auth: twentyAuth,
  name: 'emptyTrash',
  displayName: 'Empty Trash',
  description:
    'Permanently deletes every record of the selected object that is in the trash. This cannot be undone.',
  aiMetadata: {
    description:
      'Permanently destroys every record of the selected object in Twenty CRM that is currently in the trash (soft deleted). Records that are not in the trash are never touched. Destroyed records cannot be restored. Returns the destroyed records. Idempotent: a repeat call finds an empty trash and destroys nothing.',
    idempotent: true,
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
  ],
  props: {
    object: twentyRecordProps.object({
      required: true,
      description:
        'The type of record whose trash to empty, e.g. People, Companies or one of your custom objects.',
    }),
  },
  async run(context) {
    const { object } = context.propsValue;
    if (!twentyMetadataUtils.isObjectRef(object))
      throw new Error('Select an object.');

    return await twentyApi.emptyTrash({
      auth: context.auth,
      objectNamePlural: object.namePlural,
    });
  },
});
