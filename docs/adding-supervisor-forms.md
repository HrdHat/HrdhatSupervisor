# Adding New Supervisor Forms - Quick Reference

**Status**: Active Documentation  
**Last Updated**: 2026-01-20  
**Purpose**: Step-by-step guide for adding new form types to the Supervisor app

---

## Overview

Supervisor forms (Toolbox Talk, Weekly Inspection, Worker Orientation, etc.) use a **hardcoded UI approach** rather than the form_definitions table. The form structure is defined in React components, and data is stored directly in `form_instances` with the `template_id` identifying the form type.

---

## Quick Checklist

When adding a new supervisor form, you need to modify these files:

1. **`src/types/supervisorForms.ts`** - Add form type ID and config
2. **`src/components/SupervisorFormEditor.tsx`** - Add form UI component
3. **(Optional)** Database migration if schema changes needed

---

## Step 1: Register the Form Type

### File: `src/types/supervisorForms.ts`

#### 1a. Add to `FormTypeId` union type:

```typescript
export type FormTypeId = 
  // Worker form types (from hrdhat-frontend)
  | 'flra'
  | 'hot_work_permit'
  | 'equipment_inspection'
  | 'platform_equipment'
  // Supervisor-specific form types
  | 'toolbox_talk'
  | 'weekly_inspection'
  | 'worker_orientation'
  | 'your_new_form';  // ← ADD HERE
```

#### 1b. Add config to `SUPERVISOR_FORM_TYPES` array:

```typescript
{
  id: 'your_new_form',
  name: 'Your New Form Name',
  shortName: 'Short Name',
  icon: '📋',  // Use an appropriate emoji
  description: 'Brief description of what this form is for',
  category: 'supervisor',  // 'supervisor' or 'worker'
  color: 'text-blue-700',   // Tailwind text color
  bgColor: 'bg-blue-100',   // Tailwind background color
},
```

**Color Guidelines:**
- Purple: Toolbox Talk (`text-purple-700`, `bg-purple-100`)
- Green: Weekly Inspection (`text-green-700`, `bg-green-100`)
- Teal: Worker Orientation (`text-teal-700`, `bg-teal-100`)
- Blue, Orange, Red, etc. available for new forms

---

## Step 2: Create the Form UI Component

### File: `src/components/SupervisorFormEditor.tsx`

#### 2a. Create the form component function (add before the main export):

```typescript
// Your New Form
function YourNewFormForm({ formData, updateField }: FormEditorProps) {
  return (
    <div className="space-y-6">
      {/* Section 1 - Example */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
          Section Title
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Text Input Example */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Field Label</label>
            <input
              type="text"
              value={getFieldValue(formData, 'section_name', 'field_name', '') as string}
              onChange={(e) => updateField('section_name', 'field_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Placeholder text"
            />
          </div>
          
          {/* Date Input Example */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={getFieldValue(formData, 'section_name', 'date', '') as string}
              onChange={(e) => updateField('section_name', 'date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </section>

      {/* Checklist Section Example */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
          Checklist
        </h3>
        <div className="space-y-2 bg-gray-50 rounded-lg p-4">
          {['Item 1', 'Item 2', 'Item 3'].map((item, index) => (
            <label key={index} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={getFieldValue(formData, 'checklist', `item_${index}`, false) as boolean}
                onChange={(e) => updateField('checklist', `item_${index}`, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{item}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Textarea Example */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">3</span>
          Notes
        </h3>
        <textarea
          value={getFieldValue(formData, 'notes', 'additional_notes', '') as string}
          onChange={(e) => updateField('notes', 'additional_notes', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter any additional notes..."
        />
      </section>
    </div>
  );
}
```

#### 2b. Add conditional rendering in the main component:

Find the section with conditional form rendering and add your new form:

```typescript
{form.template_id === 'toolbox_talk' && (
  <ToolboxTalkForm formData={formData} updateField={updateField} />
)}
{form.template_id === 'weekly_inspection' && (
  <WeeklyInspectionForm formData={formData} updateField={updateField} />
)}
{form.template_id === 'worker_orientation' && (
  <WorkerOrientationForm formData={formData} updateField={updateField} />
)}
{form.template_id === 'your_new_form' && (  // ← ADD THIS
  <YourNewFormForm formData={formData} updateField={updateField} />
)}
{!['toolbox_talk', 'weekly_inspection', 'worker_orientation', 'your_new_form'].includes(form.template_id) && (
  <GenericFormEditor formData={formData} updateField={updateField} templateId={form.template_id} />
)}
```

**Important:** Also update the fallback condition array to include your new form type!

---

## Step 3: Database (Usually Not Required)

Supervisor forms store data in `form_instances` with:
- `template_id` = your form type ID (e.g., 'your_new_form')
- `form_data` = JSONB containing `{ modules: { section_name: { field_name: { value: ... } } } }`

**No migration needed** unless you need:
- New database columns
- Specific constraints
- RLS policy changes

---

## Data Structure

Form data follows this JSONB structure:

```json
{
  "modules": {
    "section_name": {
      "field_name": { "value": "user input" },
      "another_field": { "value": true }
    },
    "checklist": {
      "item_0": { "value": true },
      "item_1": { "value": false }
    }
  },
  "templateId": "your_new_form"
}
```

---

## Helper Functions

### `getFieldValue(formData, moduleName, fieldName, defaultValue)`

Safely retrieves a field value from the nested structure:

```typescript
// Usage examples:
const workerName = getFieldValue(formData, 'worker_info', 'name', '') as string;
const isChecked = getFieldValue(formData, 'checklist', 'item_1', false) as boolean;
const date = getFieldValue(formData, 'header', 'date', new Date().toISOString().split('T')[0]) as string;
```

### `updateField(moduleName, fieldName, value)`

Updates a field in the form data structure:

```typescript
// Usage examples:
updateField('worker_info', 'name', 'John Doe');
updateField('checklist', 'item_1', true);
updateField('header', 'date', '2026-01-20');
```

---

## UI Component Patterns

### Yes/No Toggle (for checklist items)

```typescript
const YesNoToggle = ({ moduleName, fieldName, label }: { moduleName: string; fieldName: string; label: string }) => {
  const value = getFieldValue(formData, moduleName, fieldName, null);
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updateField(moduleName, fieldName, true)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            value === true ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => updateField(moduleName, fieldName, false)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            value === false ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
};
```

### Section Header Pattern

```typescript
<h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
  <span className="w-6 h-6 rounded-full bg-{color}-100 text-{color}-700 flex items-center justify-center text-xs">
    {sectionNumber}
  </span>
  {sectionTitle}
</h3>
```

---

## Testing Checklist

After adding a new form:

1. [ ] Form appears in New Form picker
2. [ ] Form can be created successfully
3. [ ] Form data saves correctly
4. [ ] Form appears in "My Forms" list
5. [ ] Form can be opened/edited from list
6. [ ] Form can be archived
7. [ ] Archived form appears in "Archived" tab
8. [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
9. [ ] ESLint passes (`npx eslint src/`)

---

## Troubleshooting

### "Failed to create supervisor form"

- Check browser console for specific error
- Ensure `template_id` is a string, not UUID
- Verify RLS policies allow insert for authenticated user
- Check that `form_data` has `{ modules: {} }` structure

### Form doesn't appear in list

- Verify `project_id` matches current project
- Check `fetchSupervisorForms` is called when project loads
- Ensure RLS policy allows SELECT for user's forms

### Field values don't save

- Ensure `updateField` is called with correct module/field names
- Check that `saveSupervisorForm` is triggered (auto-save or manual)
- Verify JSONB structure in database

---

## Related Files

- `src/types/supervisorForms.ts` - Type definitions
- `src/components/SupervisorFormEditor.tsx` - Form UI components
- `src/components/SupervisorFormsList.tsx` - Form list display
- `src/components/NewSupervisorFormPicker.tsx` - Form creation picker
- `src/stores/supervisorStore.ts` - State management & API calls

---

## Migration Reference (if needed)

See migrations applied for supervisor forms flexibility:
- `015_supervisor_forms_flexibility.sql` - Allow NULL form_definition_id
- `016_fix_set_template_id_trigger.sql` - Fix trigger for supervisor forms
