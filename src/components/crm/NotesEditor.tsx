export default function NotesEditor({ name, defaultValue }: { name: string; defaultValue?: string }) {
  return (
    <textarea
      name={name}
      defaultValue={defaultValue}
      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
      rows={4}
      placeholder="Add notes..."
    />
  );
}
