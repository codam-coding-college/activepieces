import type {
  TwentyEnvelope,
  TwentyMetadataField,
  TwentyRecord,
  TwentyTimelineActivity,
  TwentyTimelineDiff,
} from './types';

function firstValue<T>({
  envelope,
}: {
  envelope: TwentyEnvelope<T>;
}): T | undefined {
  return Object.values(envelope.data)[0];
}

function isMetadataField(value: unknown): value is TwentyMetadataField {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'type' in value &&
    typeof value.type === 'string'
  );
}

function toTimelineActivity({
  record,
  targetColumn,
}: {
  record: TwentyRecord;
  targetColumn: string;
}): TwentyTimelineActivity | undefined {
  const recordId = record[targetColumn];
  const properties = record['properties'];

  if (
    typeof record.id !== 'string' ||
    typeof recordId !== 'string' ||
    typeof record.updatedAt !== 'string' ||
    typeof record.createdAt !== 'string' ||
    typeof properties !== 'object' ||
    properties === null ||
    !('diff' in properties) ||
    !isTimelineDiff(properties.diff) ||
    Object.keys(properties.diff).length === 0
  )
    return undefined;

  const workspaceMemberId = record['workspaceMemberId'];
  return {
    id: record.id,
    recordId,
    workspaceMemberId:
      typeof workspaceMemberId === 'string' ? workspaceMemberId : null,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
    diff: properties.diff,
  };
}

function isTimelineDiff(diff: unknown): diff is TwentyTimelineDiff {
  return (
    typeof diff === 'object' &&
    diff !== null &&
    Object.values(diff).every(
      (change) =>
        typeof change === 'object' &&
        change !== null &&
        'before' in change &&
        'after' in change
    )
  );
}

export const twentyParsingUtils = {
  firstValue,
  isMetadataField,
  toTimelineActivity,
  isTimelineDiff,
};
