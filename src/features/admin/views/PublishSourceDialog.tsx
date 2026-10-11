import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { ShieldCheck } from "lucide-react";
import {
  Field,
  FormError,
  SubmitButton,
} from "@/components/interface/WorkflowUI";
import { ShopDialog } from "@/components/marketplace/ShopDialog";
import "@/theme/workflows.css";
import { knowledgeRepository } from "../model/knowledgeRepository";
import { KNOWLEDGE_CATEGORIES } from "../model/types";
import { PublishSourceViewModel } from "../viewmodels/PublishSourceViewModel";
import { useT } from "@/i18n";

/** Publish a knowledge source. Used by the Super Admin Knowledge base screen. */
export const PublishSourceDialog = observer(function PublishSourceDialog({
  onClose,
  onPublished,
}: {
  onClose: () => void;
  onPublished: () => void;
}) {
  const t = useT();
  const [vm] = useState(() => new PublishSourceViewModel(knowledgeRepository));
  useEffect(() => vm.dispose, [vm]);
  const { form } = vm;

  return (
    <ShopDialog title={t("admin.publish.title")} onClose={onClose} wide>
      <form
        className="wf-form"
        onSubmit={(event) => {
          event.preventDefault();
          void vm.publish().then((published) => {
            if (published) onPublished();
          });
        }}
      >
        <p>{t("admin.publish.intro")}</p>
        <FormError message={vm.error} />
        <div className="wf-form-grid">
          <Field label={t("admin.publish.fieldTitle")}>
            <input
              required
              minLength={3}
              maxLength={180}
              value={form.title}
              onChange={(event) => vm.setField("title", event.target.value)}
            />
          </Field>
          <Field label={t("admin.catalogue.category")}>
            <select
              value={form.category}
              onChange={(event) => vm.setField("category", event.target.value)}
            >
              {KNOWLEDGE_CATEGORIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={t("admin.publish.content")}>
          <textarea
            required
            minLength={10}
            maxLength={4000}
            rows={4}
            value={form.content}
            onChange={(event) => vm.setField("content", event.target.value)}
          />
        </Field>
        <Field label={t("admin.publish.author")}>
          <input
            maxLength={120}
            value={form.author}
            onChange={(event) => vm.setField("author", event.target.value)}
          />
        </Field>
        <Field label={t("admin.publish.expires")}>
          <input
            required
            type="number"
            min="1"
            max="3650"
            value={form.expiresInDays}
            onChange={(event) =>
              vm.setField("expiresInDays", event.target.value)
            }
          />
        </Field>
        <div className="wf-notice">
          <ShieldCheck size={18} aria-hidden="true" />
          {t("admin.publish.notice")}
        </div>
        <SubmitButton busy={vm.publishing}>{t("admin.publish.submit")}</SubmitButton>
      </form>
    </ShopDialog>
  );
});
