import { PricingModelForm } from "@/components/catalog/PricingModelForm";
import { JsonListEditor, type FieldConfig } from "@/components/catalog/JsonListEditor";
import {
  updateServiceSuiteAction,
} from "@/app/(app)/catalog/actions";
import { getServiceSuite } from "@/lib/catalog/repo";
import type {
  DeliverableTemplate,
  DiscoveryQuestionTemplate,
  MilestoneTemplate,
} from "@/lib/catalog/types";

export const dynamic = "force-dynamic";

const ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? "demo-org";

export default async function ServiceSuiteDetailPage({ params }: { params: { id: string } }) {
  const suiteDoc = await getServiceSuite(ORG_ID, params.id);
  if (!suiteDoc) {
    return <div className="text-gray-300">Service suite not found.</div>;
  }

  const deliverableFields: FieldConfig<DeliverableTemplate>[] = [
    { key: "title", label: "Title", type: "text", placeholder: "Implementation plan" },
    { key: "description", label: "Description", type: "textarea", placeholder: "What is included?" },
    { key: "defaultIncluded", label: "Included by default", type: "checkbox" },
    { key: "sortOrder", label: "Sort Order", type: "number" },
  ];

  const milestoneFields: FieldConfig<MilestoneTemplate>[] = [
    { key: "title", label: "Title", type: "text", placeholder: "Kickoff" },
    { key: "description", label: "Description", type: "textarea", placeholder: "Milestone summary" },
    { key: "defaultDurationDays", label: "Duration (days)", type: "number" },
    {
      key: "deliverableIds",
      label: "Deliverable IDs (comma separated)",
      type: "text",
      helperText: "Map milestone to deliverables if needed.",
    },
    { key: "sortOrder", label: "Sort Order", type: "number" },
  ];

  const questionFields: FieldConfig<DiscoveryQuestionTemplate>[] = [
    { key: "question", label: "Question", type: "text", placeholder: "What outcomes are you targeting?" },
    { key: "helpText", label: "Help Text", type: "textarea", placeholder: "Context for the client" },
    {
      key: "inputType",
      label: "Input Type",
      type: "select",
      options: [
        { label: "Text", value: "text" },
        { label: "Textarea", value: "textarea" },
        { label: "Select", value: "select" },
        { label: "Multi-select", value: "multiselect" },
      ],
    },
    { key: "options", label: "Options (comma separated)", type: "text" },
    { key: "required", label: "Required", type: "checkbox" },
    { key: "sortOrder", label: "Sort Order", type: "number" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase text-gray-500">Product Layer</p>
          <h1 className="text-3xl font-bold">{suiteDoc.suite.name}</h1>
          <p className="text-gray-400 mt-1">Edit service info, templates, and discovery questions.</p>
        </div>
      </div>

      <form action={updateServiceSuiteAction.bind(null, suiteDoc.suite.id)} className="space-y-6">
        <div className="bg-gray-800 p-4 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">Basics</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Name</label>
              <input
                name="name"
                defaultValue={suiteDoc.suite.name}
                className="w-full bg-gray-900 text-white p-2 rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <textarea
                name="description"
                defaultValue={suiteDoc.suite.description}
                className="w-full bg-gray-900 text-white p-2 rounded"
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Expertise Tags (comma separated)</label>
              <input
                name="expertiseTags"
                defaultValue={suiteDoc.suite.expertiseTags?.join(", ")}
                className="w-full bg-gray-900 text-white p-2 rounded"
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">Pricing</h2>
          <PricingModelForm defaultPricing={suiteDoc.defaultPricing} />
        </div>

        <JsonListEditor<DeliverableTemplate>
          title="Default Deliverables"
          name="deliverablesJson"
          initialItems={suiteDoc.defaultDeliverables}
          fields={deliverableFields}
          blankItem={() => ({
            id: "",
            title: "",
            description: "",
            defaultIncluded: true,
            sortOrder: suiteDoc.defaultDeliverables.length,
          })}
          addLabel="Add deliverable"
        />

        <JsonListEditor<MilestoneTemplate>
          title="Default Milestones"
          name="milestonesJson"
          initialItems={suiteDoc.defaultMilestones}
          fields={milestoneFields}
          blankItem={() => ({
            id: "",
            title: "",
            description: "",
            defaultDurationDays: 0,
            sortOrder: suiteDoc.defaultMilestones.length,
            deliverableIds: [],
          })}
          addLabel="Add milestone"
        />

        <JsonListEditor<DiscoveryQuestionTemplate>
          title="Discovery Questions"
          name="discoveryQuestionsJson"
          initialItems={suiteDoc.discoveryQuestions}
          fields={questionFields}
          blankItem={() => ({
            id: "",
            question: "",
            helpText: "",
            inputType: "text",
            options: [],
            required: false,
            sortOrder: suiteDoc.discoveryQuestions.length,
          })}
          addLabel="Add question"
        />

        <div className="flex justify-end">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
