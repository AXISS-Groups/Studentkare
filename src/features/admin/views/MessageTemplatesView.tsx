import React from 'react';
import { AdminEmptySection, AdminPage } from '@/screens/workspace/admin/AdminPage';

// Message templates (design: AdminTemplates). No endpoint lists or edits templates (the
// notification outbox holds sent messages, not templates), so the list, editor and
// preview are empty and there is no "New template", "Save draft" or "Submit to Meta" action.
export function MessageTemplatesView() {
  return <AdminPage eyebrow="Content & AI" title="Message templates" description="WhatsApp, SMS and email templates. Every template should be checked so no health value leaves the app in a message.">
    <div className="sk-admin-templates">
      <AdminEmptySection title="Templates" description="Each template, its category and its approval state." emptyTitle="No templates yet." emptyDescription="Templates will be listed here once the template service is connected." />
      <AdminEmptySection title="Editor" description="The text in each language, its variables, and the checks it must pass." emptyTitle="No template selected." emptyDescription="Choose a template to edit it here once templates are available." />
      <AdminEmptySection title="Preview with sample values" description="How the message will look on a phone." emptyTitle="Nothing to preview." emptyDescription="A preview appears here for the selected template." />
    </div>
  </AdminPage>;
}
