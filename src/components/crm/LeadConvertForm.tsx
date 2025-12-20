import { convertLead } from '@/app/(app)/crm/actions';

interface LeadConvertFormProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  leadCompany?: string;
}

export default function LeadConvertForm({ leadId, leadName, leadEmail, leadCompany }: LeadConvertFormProps) {
  return (
    <form action={convertLead} className="bg-gray-800 p-4 rounded-lg space-y-4">
      <input type="hidden" name="leadId" value={leadId} />
      <div>
        <h3 className="text-lg font-bold mb-2">Company</h3>
        <input
          name="companyName"
          defaultValue={leadCompany ?? ''}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
          placeholder="Company name"
          required
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <input name="companyIndustry" placeholder="Industry" className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
          <input name="companyWebsite" placeholder="Website" className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold mb-2">Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            name="contactName"
            defaultValue={leadName}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="Contact name"
            required
          />
          <input
            name="contactEmail"
            type="email"
            defaultValue={leadEmail}
            className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white"
            placeholder="Contact email"
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <input name="contactPhone" placeholder="Phone" className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
          <input name="contactRole" placeholder="Role" className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-bold mb-2">Opportunity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input name="opportunityValue" placeholder="Value estimate" className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
          <input name="opportunityProbability" placeholder="Probability (0-100)" className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white" />
        </div>
        <select name="opportunityStage" className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white mt-2">
          <option value="discovery">Discovery</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <input
          name="nextStep"
          placeholder="Next step"
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white mt-2 w-full"
        />
      </div>
      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">
        Convert lead
      </button>
    </form>
  );
}
