import { FilterCondition, FilterOperator, FieldValue } from './types';

const fieldKeyFormat = {
  delimiter: '_',
  value: 'value',
  operator: 'operator',
  header: 'header',
  preset: 'preset',
  after: 'after',
  before: 'before',
} as const;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const LIST_OPERATORS: FilterOperator[] = ['in', 'containsAny'];

const FILTER_OPERATORS: Record<FilterOperator, true> = {
  eq: true,
  neq: true,
  in: true,
  is: true,
  gt: true,
  gte: true,
  lt: true,
  lte: true,
  startsWith: true,
  like: true,
  ilike: true,
  containsAny: true,
};

function groupConditions({
  conditions,
  delimiter,
}: {
  conditions: FlatConditions;
  delimiter: string;
}): GroupedConditions {
  return Object.entries(conditions).reduce<GroupedConditions>(
    (grouped, [key, value]) => {
      const index = key.lastIndexOf(delimiter);
      if (index <= 0) return grouped;
      const field = key.slice(0, index);
      const operation = key.slice(index + delimiter.length);
      return {
        ...grouped,
        [field]: { ...grouped[field], [operation]: value },
      };
    },
    {}
  );
}

function toFilterConditions({
  conditions,
}: {
  conditions: FlatConditions;
}): FilterCondition[] {
  const grouped = groupConditions({
    conditions,
    delimiter: fieldKeyFormat.delimiter,
  });
  return Object.entries(grouped).flatMap(([field, operations]) =>
    buildFieldConditions({ field, operations })
  );
}

function toRecordValues({
  values,
}: {
  values: FlatConditions;
}): Record<string, unknown> {
  const grouped = groupConditions({
    conditions: values,
    delimiter: fieldKeyFormat.delimiter,
  });
  return Object.fromEntries(
    Object.entries(grouped).flatMap(([field, operations]) => {
      const value = buildRecordValue({ operations });
      return value === undefined ? [] : [[field, value]];
    })
  );
}

function buildFieldConditions({
  field,
  operations,
}: {
  field: string;
  operations: ConditionOperations;
}): FilterCondition[] {
  if (operations[fieldKeyFormat.preset] !== undefined)
    return toDateConditions({ field, operations });
  const { operator, header: _header, ...values } = operations;
  return Object.entries(values).flatMap(
    ([operation, value]): FilterCondition[] => {
      const path =
        operation === fieldKeyFormat.value ? field : `${field}.${operation}`;
      if (!isFilterOperator(operator) || !isFieldValue(value)) return [];
      return [
        { field: path, operator, value: toListValue({ operator, value }) },
      ];
    }
  );
}

function toDateConditions({
  field,
  operations,
}: {
  field: string;
  operations: ConditionOperations;
}): FilterCondition[] {
  const preset = operations[fieldKeyFormat.preset];
  if (typeof preset === 'number') {
    const now = Date.now();
    const shifted = new Date(now + preset * DAY_IN_MS).toISOString();
    const current = new Date(now).toISOString();
    return [
      { field, operator: 'gte', value: preset < 0 ? shifted : current },
      { field, operator: 'lte', value: preset < 0 ? current : shifted },
    ];
  }
  if (preset !== 'custom') return [];
  return [
    {
      field,
      operator: 'gte',
      value: toOptionalString(operations[fieldKeyFormat.after]),
    },
    {
      field,
      operator: 'lte',
      value: toOptionalString(operations[fieldKeyFormat.before]),
    },
  ];
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function buildRecordValue({
  operations,
}: {
  operations: ConditionOperations;
}): unknown {
  const {
    operator: _operator,
    header: _header,
    value,
    ...subfields
  } = operations;
  if (!isEmptyValue(value)) return value;
  const filled = Object.entries(subfields).filter(
    ([, subfieldValue]) => !isEmptyValue(subfieldValue)
  );
  return filled.length > 0 ? Object.fromEntries(filled) : undefined;
}

function toListValue({
  operator,
  value,
}: {
  operator: FilterOperator;
  value: FieldValue;
}): FieldValue {
  if (!LIST_OPERATORS.includes(operator) || typeof value !== 'string')
    return value;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isFilterOperator(value: unknown): value is FilterOperator {
  return typeof value === 'string' && value in FILTER_OPERATORS;
}

function isFieldValue(value: unknown): value is FieldValue {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

export const recordParamsUtils = {
  fieldKeyFormat,
  groupConditions,
  toFilterConditions,
  toRecordValues,
};

export type FlatConditions = {
  [fieldDelimiterOperation: string]: unknown;
};

export type ConditionOperations = {
  operator?: unknown;
  header?: unknown;
  value?: unknown;
  [subfield: string]: unknown;
};

export type GroupedConditions = {
  [field: string]: ConditionOperations;
};
