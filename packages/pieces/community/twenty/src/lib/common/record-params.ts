import {
  FilterCondition,
  FilterNode,
  FilterOperator,
  FieldValue,
} from './types';

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

const EXTRA_VALUE_SUBFIELDS: Record<string, string> = {
  primaryEmail: 'additionalEmails',
  primaryLinkUrl: 'secondaryLinks',
  primaryPhoneNumber: 'additionalPhones',
};

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
}): FilterNode[] {
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
      const {
        operator: _operator,
        header: _header,
        value,
        ...subfields
      } = operations;
      if (!isEmptyValue(value)) return [[field, value]];
      const filled = Object.entries(subfields).filter(
        ([, subfieldValue]) => !isEmptyValue(subfieldValue)
      );
      return filled.length > 0 ? [[field, Object.fromEntries(filled)]] : [];
    })
  );
}

function buildFieldConditions({
  field,
  operations,
}: {
  field: string;
  operations: ConditionOperations;
}): FilterNode[] {
  if (operations[fieldKeyFormat.preset] !== undefined)
    return toDateConditions({ field, operations });
  const { operator, header: _header, ...values } = operations;
  return Object.entries(values).flatMap(([operation, value]): FilterNode[] => {
    const path =
      operation === fieldKeyFormat.value ? field : `${field}.${operation}`;
    if (!isFilterOperator(operator) || !isFieldValue(value)) return [];
    const condition: FilterCondition = {
      field: path,
      operator,
      value: toListValue({ operator, value }),
    };
    const extraSubfield = EXTRA_VALUE_SUBFIELDS[operation];
    return [
      extraSubfield
        ? withExtraValues({ condition, extraField: `${field}.${extraSubfield}` })
        : condition,
    ];
  });
}

function withExtraValues({
  condition,
  extraField,
}: {
  condition: FilterCondition;
  extraField: string;
}): FilterNode {
  const extras = extraValuePatterns({
    operator: condition.operator,
    value: condition.value,
  }).map(
    (pattern): FilterCondition => ({
      field: extraField,
      operator: 'like',
      value: pattern,
    })
  );
  if (extras.length === 0) return condition;
  if (condition.operator !== 'neq')
    return { conjunction: 'or', conditions: [condition, ...extras] };
  return {
    conjunction: 'and',
    conditions: [
      condition,
      {
        conjunction: 'or',
        conditions: [
          { conjunction: 'not', conditions: extras },
          { field: extraField, operator: 'is', value: 'NULL' },
        ],
      },
    ],
  };
}

function extraValuePatterns({
  operator,
  value,
}: {
  operator: FilterOperator;
  value: FieldValue | undefined;
}): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items.flatMap((item) => {
    if (typeof item !== 'string' || item === '') return [];
    switch (operator) {
      case 'eq':
      case 'neq':
      case 'in':
        return [`%"${item}"%`];
      case 'startsWith':
        return [`%"${item}%`];
      case 'like':
      case 'ilike':
        return [item.includes('%') ? item : `%"${item}"%`];
      default:
        return [];
    }
  });
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
