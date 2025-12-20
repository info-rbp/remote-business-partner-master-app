'use client';

import { useId, useState } from "react";

export type FieldConfig<T> = {
  key: keyof T & string;
  label: string;
  type: "text" | "textarea" | "checkbox" | "number" | "select";
  placeholder?: string;
  helperText?: string;
  options?: { label: string; value: string }[];
};

type JsonListEditorProps<T extends Record<string, unknown>> = {
  title: string;
  name: string;
  initialItems: T[];
  fields: FieldConfig<T>[];
  blankItem: () => T;
  addLabel?: string;
};

function ensureId<T extends Record<string, unknown>>(item: T) {
  if (item.id) return item;
  return { ...item, id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) } as T;
}

export function JsonListEditor<T extends Record<string, unknown>>(props: JsonListEditorProps<T>) {
  const { title, name, fields, blankItem, addLabel = "Add item" } = props;
  const listId = useId();
  const [items, setItems] = useState<T[]>(props.initialItems?.length ? props.initialItems.map(ensureId) : []);

  const updateItem = (index: number, key: keyof T & string, value: unknown) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, [key]: value };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addItem = () => {
    setItems((prev) => [...prev, ensureId(blankItem())]);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    setItems((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-gray-400">Items are saved as JSON for template seeding.</p>
        </div>
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
          onClick={addItem}
          aria-describedby={listId}
        >
          {addLabel}
        </button>
      </div>

      {items.length === 0 && <p className="text-gray-400 text-sm">No items yet. Add your first entry.</p>}

      <div className="space-y-4" id={listId}>
        {items.map((item, index) => (
          <div key={(item as { id?: string }).id ?? index} className="border border-gray-700 rounded p-3 space-y-3">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Item {index + 1}</span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  className="text-blue-400 hover:text-blue-200"
                  onClick={() => moveItem(index, "up")}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="text-blue-400 hover:text-blue-200"
                  onClick={() => moveItem(index, "down")}
                  disabled={index === items.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="text-red-400 hover:text-red-200"
                  onClick={() => removeItem(index)}
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((field) => {
                const value = item[field.key];
                if (field.type === "checkbox") {
                  return (
                    <label key={field.key} className="flex items-center space-x-2 text-sm text-gray-200">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => updateItem(index, field.key, e.target.checked)}
                        className="rounded border-gray-600 bg-gray-900"
                      />
                      <span>{field.label}</span>
                    </label>
                  );
                }

                if (field.type === "textarea") {
                  return (
                    <div key={field.key} className="md:col-span-2">
                      <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
                      <textarea
                        className="w-full bg-gray-900 text-white p-2 rounded"
                        placeholder={field.placeholder}
                        value={(value as string | undefined) ?? ""}
                        onChange={(e) => updateItem(index, field.key, e.target.value)}
                      />
                      {field.helperText && <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>}
                    </div>
                  );
                }

                if (field.type === "select") {
                  const selectValue =
                    (value as string | undefined) ??
                    field.options?.[0]?.value ??
                    "";
                  return (
                    <div key={field.key}>
                      <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
                      <select
                        className="w-full bg-gray-900 text-white p-2 rounded"
                        value={selectValue}
                        onChange={(e) => updateItem(index, field.key, e.target.value)}
                      >
                        {(field.options ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {field.helperText && <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>}
                    </div>
                  );
                }

                return (
                  <div key={field.key}>
                    <label className="block text-sm text-gray-300 mb-1">{field.label}</label>
                    {(() => {
                      const isNumber = field.type === "number";
                      const inputValue = isNumber
                        ? typeof value === "number"
                          ? value
                          : value
                            ? Number(value)
                            : ""
                        : Array.isArray(value)
                          ? value.join(", ")
                          : (value as string | number | undefined) ?? "";
                      return (
                        <input
                          type={isNumber ? "number" : "text"}
                          className="w-full bg-gray-900 text-white p-2 rounded"
                          placeholder={field.placeholder}
                          value={inputValue}
                          onChange={(e) =>
                            updateItem(
                              index,
                              field.key,
                              isNumber ? Number(e.target.value) : e.target.value
                            )
                          }
                        />
                      );
                    })()}
                    {field.helperText && <p className="text-xs text-gray-500 mt-1">{field.helperText}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <textarea
        name={name}
        className="hidden"
        readOnly
        value={JSON.stringify(items)}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
