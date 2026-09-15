# SA Care: 100 open-source healthcare repositories to consider

**Research date: 14 September 2026.** This is a curated shortlist for SA Care / Studentkare, **not a measured global ranking** and not a recommendation to install 100 dependencies. The numbered catalog contains exactly **100 distinct canonical GitHub repositories**. The practical priority order appears separately below.

**Recommendation:** develop a trustworthy, interoperable health-record and document-review pipeline first. Add consent-aware retrieval and measurable NLP assistance next. Keep imaging inference, camera physiology, clinical prediction, and genomics behind separately evaluated research workflows.

## Fit to the current application

Sources inspected: [`package.json`](../../package.json), [`backend/requirements.txt`](../../backend/requirements.txt), [`ARCHITECTURE.md`](../../ARCHITECTURE.md), the [application audit](../application-audit-2026-09-13.md), [implementation status](../implementation-status.md), [healthcare roadmap](../healthcare-development-roadmap.md), and [sensor review](../existing-wellbeing-sensor-review.md).

- **Frontend:** React 18.3, TypeScript, Vite 6, MobX feature stores/ViewModels, a navigation facade, and an Expo 52 / React Native 0.76 native target. Favor TypeScript clients and browser components with a distinct native presentation layer.
- **Backend:** FastAPI, Pydantic 2, SQLAlchemy, SQLite/PostgreSQL, session cookies and role checks. Python NLP and signal-processing libraries fit best in bounded background workers behind this API.
- **Product opportunities:** private health records, lab/Rx intake, clinician review, appointments, medication follow-up, campus services, wellbeing, device observations, and insurer/ABDM adapters.
- **Existing workflow foundation:** the implementation-status update describes persistent jobs, runs, and an outbox. Reuse and verify those before adding another workflow engine.
- **Evidence limit:** these documents contain dated, sometimes conflicting snapshots and aspirational architecture claims. This research did not re-audit execution or establish which previous defects are still present. A screen, FHIR library, or named agent does not prove a connected clinical service.

### Important India/FHIR compatibility finding

The official [NRCeS ABDM implementation guide](https://nrces.in/ndhm/fhir/r4/), fetched during this research, identifies itself as **6.5.0**, based on **FHIR R4 / 4.0.1**; the page's own generation date is 8 May 2025. That is a live observation in 2026, not a claim that the guide was released in 2026. Pin the guide/package version accepted by the actual partner.

The current `fhir.resources` README advertises **R5, R4B, and STU3**. R4B is not interchangeable with R4. A Pydantic-compatible package alone does not validate ABDM profiles, terminology, document bundles, consent exchange, or partner onboarding. Resolve the supported release/version matrix before using it on the exchange boundary.

## Selection method and how to read the catalog

Selection favored: direct healthcare relevance; a concrete SA Care workflow; fit with Python/TypeScript or a clear service boundary; standards and data provenance; reusable libraries over replacement platforms; and identifiable licensing. Broad frameworks appear only where they enable privacy, reproducibility, deployment, or evaluation. Genomics and drug-discovery entries deliberately represent possible academic partnerships, not near-term student-app features.

Research combined live web discovery, GitHub REST repository metadata, targeted README/license inspection, current Medplum documentation through Context7, and the official ABDM guide. GitHub canonical names were used after following transfers/renames; aliases were deduplicated. No star-based score or unsupported claim of clinical superiority was used.

**Adoption tiers**

- **near-term:** a bounded pilot or engineering integration has immediate value; still requires compatibility and acceptance checks.
- **evaluate:** useful if a partner, workload, deployment boundary, or benchmark justifies the additional component.
- **research:** offline experiments, reference implementations, or specialist collaborations only in this roadmap. This is our adoption recommendation, not necessarily a license restriction imposed by the author.

**Status notation:** `N` means GitHub reported `archived=false` and `disabled=false`; it does **not** mean actively maintained or production-ready. `A` means archived. Dates are the observed UTC `pushed_at` date, not a release date or necessarily a default-branch code change. `quiet` flags a last push more than one year before this research date; mature projects may legitimately be quiet. Every row has an observed push date.

**License notation:** unmarked SPDX-style labels are GitHub's detected repository license, not a complete legal audit. Linked labels resolve ambiguous/missing API detection using inspected LICENSE/COPYING/COPYRIGHT, README, or package metadata. `declared` means a project declaration was found but a full grant was not verified. **Unknown** means permission has not been established; do not infer permission from public source access. For every model-bearing repository, weights, training data, and downstream artifacts have **unknown/unverified rights unless separately checked**. GPL/AGPL/MPL, custom terms, and mixed distributions deserve version-specific review.

## Practical top 10 for SA Care

Priority is based on app fit and sequencing, not popularity. The catalog number identifies the repository; these are not additional catalog entries.

| Priority | Repository / catalog number | First useful deliverable | Acceptance condition |
| --- | --- | --- | --- |
| P01 | **FHIR Resources** — #6 | A Python exchange-contract spike for Patient, Observation, DiagnosticReport, and DocumentReference. | Demonstrate the exact R4/Pydantic/Python version combination; reject accidental R5/R4B payloads. Tier: evaluate until resolved. |
| P02 | **HL7 FHIR core validator** — #9 | Validate export bundles against pinned ABDM profiles in CI and the intake worker. | Known-good examples pass; deliberately invalid codes, references, cardinalities, and versions fail with actionable errors. |
| P03 | **Synthea** — #10 | A reproducible, synthetic student-record fixture set for import/export and access-isolation tests. | No production seeding; label synthetic data; adapt scenarios without claiming Indian population representativeness. |
| P04 | **AEHRC Smart Forms** — #12 | A versioned intake or follow-up Questionnaire with saved QuestionnaireResponse. | Check React 18 compatibility, keyboard access, conditional questions, draft recovery, and a separate native rendering strategy. |
| P05 | **PaddleOCR** — #57 | Extract text, coordinates, and confidence from uploaded lab reports and prescriptions. | Original page is always visible; low-quality text abstains; medication fields require review before any action. |
| P06 | **medspaCy** — #41 | Propose structured symptoms, medication mentions, sections, negation, and experiencer/context from reviewed text. | Evaluate on local English/code-mixed examples; preserve text spans; distinguish “no fever” and family history from patient findings. |
| P07 | **Presidio** — #81 | Redact identifiable text before it reaches research exports and model telemetry. | Measure missed identifiers, including local IDs/contact formats; prevent raw PHI in logs; redaction is not proof of anonymization. |
| P08 | **pgvector** — #95 | Search an approved care-information corpus with document version and source citations. | Tenant/consent filters apply during retrieval; revoked/deleted material is removed from derived indexes; test retrieval recall. |
| P09 | **MLflow** — #88 | A versioned evaluation ledger for OCR, extraction, and care-navigation changes. | Link each result to input-fixture hash, model/rule version, metrics, and reviewer outcome; exclude patient text from default tracing. |
| P10 | **NeuroKit2** — #61 | An offline signal-quality and feature benchmark for real ECG/PPG observations. | Compare with reference recordings, record rejected windows, and keep estimates separate from device measurements. Tier: evaluate. |

Medplum (#1) is the strongest full-platform stack match to investigate when a dedicated FHIR repository is needed. Its TypeScript/React approach is attractive, but adding its server, identity, and storage alongside FastAPI is a deliberate architecture decision. Do not migrate the application just to obtain a few FHIR types.

## Catalog — exactly 100 repositories

### A. FHIR, structured care, terminology-ready data, and clinical systems (1–20)

| # | Canonical GitHub repository | Purpose | Concrete SA Care use / integration boundary | Tier | Code license / caveat | Observed status / last push |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | [medplum/medplum](https://github.com/medplum/medplum) | FHIR platform, TypeScript SDK, React components. | Pilot a dedicated clinical repository behind FastAPI; reconcile patient identity and session authorization rather than creating competing records. | evaluate | Apache-2.0; hosted services and compliance work are separate. | N · 2026-09-14 |
| 2 | [hapifhir/hapi-fhir](https://github.com/hapifhir/hapi-fhir) | Java FHIR client/server framework. | Connect a provider's FHIR service or evaluate a Java FHIR server as an alternative to #1, not a second mandatory backend. | evaluate | Apache-2.0 | N · 2026-09-14 |
| 3 | [FirelyTeam/firely-net-sdk](https://github.com/FirelyTeam/firely-net-sdk) | .NET FHIR SDK. | Build an isolated adapter only when a hospital's integration team uses .NET. | evaluate | [BSD-3-Clause](https://github.com/FirelyTeam/firely-net-sdk/blob/develop/LICENSE); SDK is distinct from commercial server products. | N · 2026-09-14 |
| 4 | [smart-on-fhir/client-js](https://github.com/smart-on-fhir/client-js) | Browser SMART-on-FHIR client. | Launch a consent-scoped clinician web view from a compatible EHR; validate OAuth launch context and scopes. | evaluate | [Apache-2.0](https://github.com/smart-on-fhir/client-js/blob/master/LICENSE) | N · 2025-12-22 |
| 5 | [smart-on-fhir/client-py](https://github.com/smart-on-fhir/client-py) | Python SMART/FHIR client. | Fetch partner-authorized records through a backend adapter; check supported FHIR versions and token lifecycle. | evaluate | [Apache-2.0](https://github.com/smart-on-fhir/client-py/blob/main/LICENSE); canonical successor to the old `fhirclient` repository URL. | N · 2026-04-13 |
| 6 | [nazrulworld/fhir.resources](https://github.com/nazrulworld/fhir.resources) | Pydantic-based FHIR resource models. | Create typed record-exchange DTOs; first resolve the current R5/R4B versus ABDM R4 compatibility gap. | evaluate | [BSD-3-Clause](https://github.com/nazrulworld/fhir.resources/blob/main/LICENSE) | N · 2026-07-03 |
| 7 | [HL7/fhir](https://github.com/HL7/fhir) | FHIR specification source and artifacts. | Ground record mappings, reference handling, and terminology bindings in the exact exchange release. Reference material, not a drop-in server. | near-term | [BSD-3-Clause general code grant; mixed licenses](https://github.com/HL7/fhir/blob/master/LICENSE); specification/content terms differ. | N · 2026-09-14 |
| 8 | [HL7/fhir-ig-publisher](https://github.com/HL7/fhir-ig-publisher) | Builds FHIR implementation guides. | Publish SA Care's documented mappings and examples if campus/provider extensions become necessary. | evaluate | Apache-2.0 | N · 2026-09-11 |
| 9 | [hapifhir/org.hl7.fhir.core](https://github.com/hapifhir/org.hl7.fhir.core) | HL7 core artifacts and FHIR validator. | Run a pinned validator in CI/worker isolation against ABDM bundles; do not equate Pydantic validation with profile conformance. | near-term | Apache-2.0 | N · 2026-09-14 |
| 10 | [synthetichealth/synthea](https://github.com/synthetichealth/synthea) | Synthetic patient and longitudinal record generator. | Build repeatable lab, medication, encounter, and consent-isolation fixtures without copying patient records. | near-term | Apache-2.0; synthetic realism is not epidemiological validity. | N · 2026-08-18 |
| 11 | [LHNCBC/lforms](https://github.com/LHNCBC/lforms) | Structured health forms and FHIR Questionnaire tooling. | Compare with #12 for lab intake and standardized screening forms in a browser integration. | evaluate | [Custom BSD-style NLM terms](https://github.com/LHNCBC/lforms/blob/master/LICENSE.md); included LOINC/UCUM content has separate conditions. | N · 2026-09-09 |
| 12 | [aehrc/smart-forms](https://github.com/aehrc/smart-forms) | React FHIR Structured Data Capture forms. | Build versioned onboarding, symptom intake, and clinician follow-up forms; adapt presentation for native. | near-term | Apache-2.0; questionnaire instruments/scoring content require their own rights. | N · 2026-09-10 |
| 13 | [cqframework/clinical_quality_language](https://github.com/cqframework/clinical_quality_language) | Clinical Quality Language authoring/translation tools. | Represent clinician-authored preventive-care eligibility logic in versioned, testable artifacts. | evaluate | Apache-2.0; clinical rules still require evidence and review. | N · 2026-09-12 |
| 14 | [cqframework/cql-execution](https://github.com/cqframework/cql-execution) | JavaScript execution of compiled CQL. | Explain an approved reminder rule in a care-plan UI; use authoritative backend evaluation for consequential actions. | evaluate | Apache-2.0; supply the right data adapter and terminology. | N · 2026-09-11 |
| 15 | [OHDSI/CommonDataModel](https://github.com/OHDSI/CommonDataModel) | OMOP observational-data schema and DDL generation. | Create a separate, governed research warehouse for longitudinal campus outcomes; retain the operational model. | research | [Apache-2.0 declared in DESCRIPTION](https://github.com/OHDSI/CommonDataModel/blob/main/DESCRIPTION); vocabulary rights separate. | N · 2026-08-25 |
| 16 | [OHDSI/DataQualityDashboard](https://github.com/OHDSI/DataQualityDashboard) | OMOP data conformance, completeness, plausibility checks. | Audit an approved research export for implausible units, missing concepts, and inconsistent encounter dates. | research | [Apache-2.0 declared in DESCRIPTION](https://github.com/OHDSI/DataQualityDashboard/blob/main/DESCRIPTION); full root license grant not verified. | N · 2026-09-12 |
| 17 | [openmrs/openmrs-core](https://github.com/openmrs/openmrs-core) | Extensible medical-record platform. | Integrate with a campus clinic already using OpenMRS; study encounter/visit modeling rather than replacing SA Care. | evaluate | [MPL-2.0 plus Healthcare Disclaimer](https://github.com/openmrs/openmrs-core/blob/master/LICENSE); file-level copyleft. | N · 2026-09-13 |
| 18 | [openemr/openemr](https://github.com/openemr/openemr) | EHR and practice management. | Exchange clinic appointments and encounter records through a supported partner interface. | evaluate | GPL-3.0; copyleft; upstream certification does not certify SA Care. | N · 2026-09-14 |
| 19 | [Bahmni/bahmni-core](https://github.com/Bahmni/bahmni-core) | OpenMRS-based hospital integration modules. | Explore referrals and lab workflows with a Bahmni-running provider; needs the surrounding platform. | evaluate | AGPL-3.0; network-copyleft obligations require review. | N · 2026-09-11 |
| 20 | [LinuxForHealth/FHIR](https://github.com/LinuxForHealth/FHIR) | FHIR server and related services. | Compare server architecture or support an existing partner deployment; prefer a fresher option for a new pilot. | research | Apache-2.0 | N · 2024-04-18 · quiet; not marked archived |

### B. DICOM, medical imaging, annotation, and imaging AI (21–40)

| # | Canonical GitHub repository | Purpose | Concrete SA Care use / integration boundary | Tier | Code license / caveat | Observed status / last push |
| --- | --- | --- | --- | --- | --- | --- |
| 21 | [OHIF/Viewers](https://github.com/OHIF/Viewers) | Browser DICOM viewer. | Open authorized imaging studies from a clinician's record timeline using DICOMweb and scoped access. | evaluate | MIT; viewer deployment is not diagnostic-device approval. | N · 2026-09-14 |
| 22 | [cornerstonejs/cornerstone3D](https://github.com/cornerstonejs/cornerstone3D) | Web medical-image rendering and interaction. | Build a narrow image-preview/annotation component only if a full OHIF deployment is excessive. | evaluate | MIT; browser/WebGL fit does not establish React Native compatibility. | N · 2026-09-14 |
| 23 | [dcm4che/dcm4che](https://github.com/dcm4che/dcm4che) | Java DICOM toolkit. | Bridge a partner's DICOM transfer workflow in a hospital-network service. | evaluate | [MPL-1.1](https://github.com/dcm4che/dcm4che/blob/master/LICENSE.txt); file-level copyleft. | N · 2026-09-07 |
| 24 | [pydicom/pydicom](https://github.com/pydicom/pydicom) | Python DICOM parsing/writing. | Extract study metadata for an upload-review queue and test de-identification transformations. | evaluate | [MIT plus BSD-3-Clause dictionary portions](https://github.com/pydicom/pydicom/blob/main/LICENSE); tag removal alone is insufficient de-identification. | N · 2026-09-07 |
| 25 | [pydicom/pynetdicom](https://github.com/pydicom/pynetdicom) | Python DICOM networking. | Implement a small, network-isolated study receiver for a partner imaging pilot. | evaluate | MIT | N · 2026-09-07 |
| 26 | [dcmjs-org/dcmjs](https://github.com/dcmjs-org/dcmjs) | JavaScript DICOM manipulation. | Convert supported browser annotations into DICOM structures for round-trip review. | evaluate | MIT | N · 2026-07-18 |
| 27 | [ImagingDataCommons/highdicom](https://github.com/ImagingDataCommons/highdicom) | High-level DICOM SR/SEG and other object creation. | Package reviewed imaging measurements with source-image references instead of detached AI text. | evaluate | MIT | N · 2026-09-13 |
| 28 | [ImagingDataCommons/dicomweb-client](https://github.com/ImagingDataCommons/dicomweb-client) | Python DICOMweb client. | Retrieve authorized study metadata/images from a partner PACS through the backend. | evaluate | MIT | N · 2026-08-17 |
| 29 | [DCMTK/dcmtk](https://github.com/DCMTK/dcmtk) | DICOM C++ libraries and command-line utilities. | Build interoperability fixtures and investigate transfer/encoding failures in a test environment. | evaluate | [BSD-style main grant; mixed portions/modules](https://github.com/DCMTK/dcmtk/blob/master/COPYRIGHT). | N · 2026-09-13 · official GitHub mirror |
| 30 | [Slicer/Slicer](https://github.com/Slicer/Slicer) | Desktop 3D medical-image computing. | Give a research clinician a workstation for inspecting and correcting study segmentations. | research | [Custom 3D Slicer BSD-style agreement](https://github.com/Slicer/Slicer/blob/main/License.txt); not simply MIT/BSD-3-Clause. | N · 2026-09-14 |
| 31 | [InsightSoftwareConsortium/ITK](https://github.com/InsightSoftwareConsortium/ITK) | Image registration, segmentation, and processing. | Build a controlled preprocessing pipeline for a specialist imaging collaboration. | research | Apache-2.0 | N · 2026-09-11 |
| 32 | [SimpleITK/SimpleITK](https://github.com/SimpleITK/SimpleITK) | Simplified image-processing interfaces to ITK. | Normalize spacing/orientation in Python workers while retaining original study geometry. | evaluate | Apache-2.0 | N · 2026-09-14 |
| 33 | [nipy/nibabel](https://github.com/nipy/nibabel) | Neuroimaging/NIfTI format access. | Read a research MRI export and preserve voxel/world-coordinate metadata. | research | [MIT main package; third-party code/data exceptions](https://github.com/nipy/nibabel/blob/master/COPYING). | N · 2026-09-14 |
| 34 | [TorchIO-project/torchio](https://github.com/TorchIO-project/torchio) | Medical-volume preprocessing, sampling, augmentation. | Reproduce imaging training transformations and prevent patient-level train/test leakage. | research | Apache-2.0 | N · 2026-08-01 |
| 35 | [Project-MONAI/MONAI](https://github.com/Project-MONAI/MONAI) | Medical-imaging deep-learning framework. | Train/evaluate a partner-approved image model in a separate GPU pipeline, not in request handlers. | research | Apache-2.0; each pretrained bundle has separate asset terms. | N · 2026-09-14 |
| 36 | [Project-MONAI/MONAILabel](https://github.com/Project-MONAI/MONAILabel) | Assisted medical-image annotation. | Create a clinician-corrected segmentation dataset with recorded annotator decisions. | research | Apache-2.0; model suggestions are not reference truth. | N · 2026-07-29 |
| 37 | [Project-MONAI/monai-deploy-app-sdk](https://github.com/Project-MONAI/monai-deploy-app-sdk) | Packages healthcare imaging inference applications. | Wrap a validated research model with explicit inputs, outputs, and image provenance for a partner sandbox. | evaluate | Apache-2.0; packaging is not clinical certification. | N · 2026-09-09 |
| 38 | [MIC-DKFZ/nnUNet](https://github.com/MIC-DKFZ/nnUNet) | Self-configuring biomedical segmentation training. | Establish a segmentation baseline before developing custom medical-image architectures. | research | Apache-2.0; data and checkpoints require separate review. | N · 2026-09-14 |
| 39 | [bowang-lab/MedSAM](https://github.com/bowang-lab/MedSAM) | Promptable medical-image segmentation research. | Compare interactive contour proposals against clinician annotations on a licensed evaluation set. | research | Apache-2.0 code; checkpoint/data rights unverified. | N · 2025-05-07 · quiet |
| 40 | [wasserth/TotalSegmentator](https://github.com/wasserth/TotalSegmentator) | CT/MR anatomical segmentation. | Explore structured anatomy measurements in an imaging partnership, with source images and clinician review. | research | Apache-2.0 code; **task-specific weights can require commercial licenses or be noncommercial-only**; see licensing notes. | N · 2026-09-10 |

### C. Clinical NLP, document intelligence, and terminology (41–60)

| # | Canonical GitHub repository | Purpose | Concrete SA Care use / integration boundary | Tier | Code license / caveat | Observed status / last push |
| --- | --- | --- | --- | --- | --- | --- |
| 41 | [medspacy/medspacy](https://github.com/medspacy/medspacy) | Clinical text sections, concepts, and contextual attributes. | Propose source-linked structured findings from reviewed notes; handle negation and family-history context. | near-term | MIT; README calls it beta; local language/rule coverage must be measured. | N · 2026-06-04 |
| 42 | [allenai/scispacy](https://github.com/allenai/scispacy) | Biomedical/scientific NLP pipelines. | Index approved medical literature and compare entity extraction against #41 for document search. | evaluate | Apache-2.0 code; model and UMLS terminology rights separate. | N · 2025-12-04 |
| 43 | [medspacy/medspacy_io](https://github.com/medspacy/medspacy_io) | Clinical NLP input/output helpers. | Prototype exporting extracted spans to a review dataset, behind SA Care's tenant-scoped persistence adapter. | evaluate | MIT; additional package, not a second NLP engine. | N · 2026-04-13 |
| 44 | [CogStack/cogstack-nlp](https://github.com/CogStack/cogstack-nlp) | Clinical concept annotation, including MedCAT. | Evaluate terminology-linked note search and reviewer correction workflows. | evaluate | Apache-2.0 current code; model packs/UMLS/SNOMED rights separate. | N · 2026-09-11 · successor to archived MedCAT repo |
| 45 | [JohnSnowLabs/spark-nlp](https://github.com/JohnSnowLabs/spark-nlp) | Distributed NLP pipelines on Spark. | Consider batch processing only if campus-document volume justifies Spark operations. | evaluate | Apache-2.0 OSS library; **commercial healthcare products/models are not included by implication**. | N · 2026-09-12 |
| 46 | [apache/ctakes](https://github.com/apache/ctakes) | Clinical NLP with UIMA. | Benchmark clinical entity/assertion extraction against Python options in an isolated Java service. | evaluate | Apache-2.0; terminology resources can require separate access/licenses. | N · 2026-08-12 |
| 47 | [ncbi-nlp/NegBio](https://github.com/ncbi-nlp/NegBio) | Negation/uncertainty detection for radiology reports. | Build regression examples for phrases such as “cannot exclude” versus confirmed findings. | research | [US-government public-domain notice](https://github.com/ncbi-nlp/NegBio/blob/master/LICENSE.txt); not an MIT grant. | N · 2023-07-16 · quiet |
| 48 | [OHNLP/MedTagger](https://github.com/OHNLP/MedTagger) | Lightweight clinical NLP on UIMA. | Compare configurable rule-based extraction for referral letters and discharge summaries. | evaluate | Apache-2.0 | N · 2026-04-10 |
| 49 | [dmis-lab/biobert](https://github.com/dmis-lab/biobert) | Biomedical BERT training/fine-tuning research. | Establish an offline biomedical entity/relation baseline; do not treat it as a medical chatbot. | research | [Apache-2.0 with dataset notices](https://github.com/dmis-lab/biobert/blob/master/LICENSE); BioASQ/PubMed conditions separate. | N · 2023-08-13 · quiet |
| 50 | [microsoft/BioGPT](https://github.com/microsoft/BioGPT) | Biomedical language-generation research. | Investigate constrained literature relation extraction on approved public material. | research | MIT code; checkpoints/corpus rights unverified. | N · 2024-07-25 · quiet |
| 51 | [ncbi-nlp/bluebert](https://github.com/ncbi-nlp/bluebert) | Biomedical/clinical BERT baseline. | Compare clinical-note representations on a licensed benchmark, segregated from production records. | research | [US-government public-domain notice](https://github.com/ncbi-nlp/bluebert/blob/master/LICENSE.txt); MIMIC-derived assets need separate review. | N · 2023-03-25 · quiet |
| 52 | [EmilyAlsentzer/clinicalBERT](https://github.com/EmilyAlsentzer/clinicalBERT) | Clinical BERT embedding experiments. | Use as a historical clinical-text baseline to test whether a newer model actually improves extraction. | research | MIT code; clinical corpus and checkpoint terms unverified. | N · 2020-08-25 · quiet |
| 53 | [Georgetown-IR-Lab/QuickUMLS](https://github.com/Georgetown-IR-Lab/QuickUMLS) | Approximate UMLS concept matching. | Propose terminology candidates from lab/referral text, then require human mapping confirmation. | evaluate | MIT code; a UMLS license and allowed vocabulary distribution are separate. | N · 2024-08-12 · quiet |
| 54 | [stanfordmlgroup/chexpert-labeler](https://github.com/stanfordmlgroup/chexpert-labeler) | Rule-based chest-radiology report labeling. | Evaluate assertion/uncertainty handling on a licensed radiology-report benchmark. | research | MIT code; CheXpert dataset rights are separate. | N · 2023-02-03 · quiet |
| 55 | [kormilitzin/med7](https://github.com/kormilitzin/med7) | Medication entity extraction research. | Compare medication, dose, route, and frequency suggestions for the Rx review queue. | research | Apache-2.0 code; pretrained assets and local prescription performance unverified. | N · 2024-12-11 · quiet |
| 56 | [grobidOrg/grobid](https://github.com/grobidOrg/grobid) | Scholarly-document structure and citation extraction. | Ingest permitted medical papers into an evidence library with title, section, and bibliography provenance. | evaluate | Apache-2.0; access to a paper is not redistribution permission. | N · 2026-09-13 |
| 57 | [PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | OCR and document-layout extraction. | Run lab/Rx intake in a worker and return text boxes, confidence, page references, and review status. | near-term | Apache-2.0 code; chosen weights/languages and handwriting accuracy require review. | N · 2026-07-22 |
| 58 | [mindee/doctr](https://github.com/mindee/doctr) | Neural document text detection/recognition. | Benchmark against #57 on the same lab-report fixtures before choosing one OCR engine. | evaluate | Apache-2.0 | N · 2026-09-01 |
| 59 | [IHTSDO/snowstorm](https://github.com/IHTSDO/snowstorm) | SNOMED CT terminology server. | Provide versioned concept lookup for clinician-reviewed conditions and coded referrals. | evaluate | [Apache-2.0 code](https://github.com/IHTSDO/snowstorm/blob/master/LICENSE.md); **SNOMED CT content rights are separate**. | N · 2026-09-14 |
| 60 | [OHDSI/Usagi](https://github.com/OHDSI/Usagi) | Assisted source-code to standard-concept mapping. | Have a clinical data steward map partner lab/service codes for an OMOP export; preserve approved mapping versions. | evaluate | [Apache-2.0 declared in README](https://github.com/OHDSI/Usagi/blob/master/README.md); root grant not verified; vocabulary rights separate. | N · 2026-05-26 |

### D. Biosignals, clinical ML, and specialist biomedical research (61–80)

| # | Canonical GitHub repository | Purpose | Concrete SA Care use / integration boundary | Tier | Code license / caveat | Observed status / last push |
| --- | --- | --- | --- | --- | --- | --- |
| 61 | [neuropsychology/NeuroKit](https://github.com/neuropsychology/NeuroKit) | ECG, PPG, respiration, and other signal processing. | Benchmark quality filtering and descriptive features from genuinely captured signals. | evaluate | MIT; physiological features do not establish diagnosis or stress state. | N · 2026-09-06 |
| 62 | [MIT-LCP/wfdb-python](https://github.com/MIT-LCP/wfdb-python) | Waveform database reading and signal utilities. | Build an ECG/PPG regression harness using appropriately licensed reference recordings. | evaluate | MIT code; PhysioNet datasets have their own access and reuse terms. | N · 2026-06-30 |
| 63 | [mne-tools/mne-python](https://github.com/mne-tools/mne-python) | EEG/MEG processing and analysis. | Support an explicitly consented university neurophysiology collaboration, not mood inference from app interaction. | research | BSD-3-Clause | N · 2026-09-14 |
| 64 | [mne-tools/mne-bids](https://github.com/mne-tools/mne-bids) | Standardized BIDS neurophysiology data I/O. | Export research recordings with consistent event/channel metadata and reviewed de-identification. | research | BSD-3-Clause | N · 2026-09-14 |
| 65 | [paulvangentcom/heartrate_analysis_python](https://github.com/paulvangentcom/heartrate_analysis_python) | HeartPy PPG/ECG heart-rate analysis. | Compare peak detection and rejected-window behavior with #61 on noisy wearable data. | evaluate | MIT; no medical-device accuracy guarantee. | N · 2025-12-30 |
| 66 | [PIA-Group/BioSPPy](https://github.com/PIA-Group/BioSPPy) | Biosignal-processing reference implementations. | Reproduce legacy experiments only; prefer a supported alternative for a new sensor worker. | research | [BSD-3-Clause-style grant](https://github.com/PIA-Group/BioSPPy/blob/master/LICENSE). | **A · 2022-08-02 · archived** |
| 67 | [phuselab/pyVHR](https://github.com/phuselab/pyVHR) | Video-based remote pulse research. | Evaluate the experimental camera-pulse feature across lighting, motion, and skin-tone conditions against a reference device. | research | GPL-3.0; copyleft; capture quality and fairness need measured validation. | N · 2024-11-20 · quiet |
| 68 | [AmbiqAI/physiokit](https://github.com/AmbiqAI/physiokit) | Ambulatory biosignal processing/synthesis toolkit. | Build synthetic-noise fixtures and compare embedded-device ECG/PPG processing pipelines. | evaluate | BSD-3-Clause; synthetic signals are test inputs, not measured patient observations. | N · 2026-01-20 |
| 69 | [brainflow-dev/brainflow](https://github.com/brainflow-dev/brainflow) | Biosensor acquisition and signal processing. | Assess a specific supported research device through an acquisition bridge with device/source metadata. | research | [MIT core plus restrictive bundled SimpleBLE terms](https://github.com/brainflow-dev/brainflow/blob/master/LICENSE); **distribution is not uniformly OSS**. | N · 2026-09-13 |
| 70 | [raphaelvallat/yasa](https://github.com/raphaelvallat/yasa) | Polysomnography/sleep-signal analysis. | Work with a sleep laboratory on real PSG exports; do not score sleep stages from an app timer. | research | BSD-3-Clause; model/data rights and target-device validity separate. | N · 2026-09-11 |
| 71 | [sunlabuiuc/PyHealth](https://github.com/sunlabuiuc/PyHealth) | Healthcare ML datasets/tasks/models toolkit. | Establish a consented longitudinal-record prediction benchmark with patient/time-separated splits. | research | MIT; dataset access is not granted by the toolkit. | N · 2026-09-12 |
| 72 | [vanderschaarlab/autoprognosis](https://github.com/vanderschaarlab/autoprognosis) | Automated clinical-prognosis modeling. | Compare calibration and missing-data handling in an approved retrospective study. | research | Apache-2.0; no automatic clinical risk deployment. | N · 2025-03-26 · quiet |
| 73 | [vanderschaarlab/temporai](https://github.com/vanderschaarlab/temporai) | Medical time-series ML framework. | Reproduce longitudinal forecasting experiments; budget for dependency modernization. | research | Apache-2.0 | N · 2023-12-14 · quiet |
| 74 | [mims-harvard/TDC](https://github.com/mims-harvard/TDC) | Therapeutics datasets, benchmarks, and tasks. | Offer a governed pharmacology research workspace if a university partner supplies a valid project. | research | MIT toolkit; each dataset/task has independent terms. | N · 2025-07-13 · quiet |
| 75 | [scverse/scanpy](https://github.com/scverse/scanpy) | Single-cell expression analysis. | Analyze de-identified research-lab exports in a separate genomics collaboration. No student-facing screening proposal. | research | BSD-3-Clause | N · 2026-09-11 |
| 76 | [scverse/anndata](https://github.com/scverse/anndata) | Annotated biological matrix representation. | Standardize consented omics research artifacts and metadata, outside the patient-record OLTP schema. | research | BSD-3-Clause | N · 2026-09-10 |
| 77 | [scverse/scvi-tools](https://github.com/scverse/scvi-tools) | Probabilistic single-cell/spatial omics models. | Evaluate batch effects and uncertainty in an academic biomedical research pipeline. | research | BSD-3-Clause; learned artifacts/data require separate review. | N · 2026-09-10 |
| 78 | [deepchem/deepchem](https://github.com/deepchem/deepchem) | ML for chemistry, biology, and drug discovery. | Support a pharmacy-school research partnership; never turn molecular predictions into prescription advice. | research | MIT; individual datasets/checkpoints separate. | N · 2026-08-20 |
| 79 | [fepegar/unet](https://github.com/fepegar/unet) | Small 1D/2D/3D U-Net implementation. | Establish a reproducible signal/image segmentation baseline before adding framework complexity. | research | MIT | N · 2024-12-13 · quiet |
| 80 | [mlmed/torchxrayvision](https://github.com/mlmed/torchxrayvision) | Chest-X-ray models and dataset interfaces. | Benchmark imaging-model performance and domain shift using approved external studies. | research | [Apache-2.0 main library; baseline-model licenses vary](https://github.com/mlmed/torchxrayvision/blob/main/LICENSE); not a blanket grant to images/weights. | N · 2026-08-24 |

### E. Privacy, access control, annotation, evaluation, and MLOps (81–100)

| # | Canonical GitHub repository | Purpose | Concrete SA Care use / integration boundary | Tier | Code license / caveat | Observed status / last push |
| --- | --- | --- | --- | --- | --- | --- |
| 81 | [data-privacy-stack/presidio](https://github.com/data-privacy-stack/presidio) | PII detection and redaction. | Redact research exports and telemetry with local identifier recognizers plus sampled human review. | near-term | MIT; moved from Microsoft; missed identifiers remain possible. | N · 2026-09-14 |
| 82 | [OpenMined/PySyft](https://github.com/OpenMined/PySyft) | Controlled computation on remotely held data. | Evaluate a multi-campus research collaboration without centrally pooling raw records. | research | Apache-2.0; deployment and output controls still determine privacy. | N · 2026-09-13 |
| 83 | [flwrlabs/flower](https://github.com/flwrlabs/flower) | Federated-learning framework. | Prototype cross-campus model evaluation/training only after governance and data contracts exist. | research | Apache-2.0; federated updates can leak information. | N · 2026-09-14 |
| 84 | [meta-pytorch/opacus](https://github.com/meta-pytorch/opacus) | Differentially private PyTorch training. | Measure a privacy/utility trade-off with explicit sampling assumptions and an auditable privacy budget. | research | Apache-2.0; library use alone is not a privacy guarantee. | N · 2026-07-13 |
| 85 | [IBM/differential-privacy-library](https://github.com/IBM/differential-privacy-library) | Differentially private statistics and ML. | Explore aggregate campus reports with suppression and cumulative query-budget accounting. | evaluate | MIT; privacy depends on parameters, composition, and threat model. | N · 2025-09-17 |
| 86 | [open-policy-agent/opa](https://github.com/open-policy-agent/opa) | Policy decision engine. | Centralize clinician assignment, campus scope, and consent-purpose rules if existing checks become hard to audit. | evaluate | Apache-2.0; enforcement must remain on every backend access path. | N · 2026-09-14 |
| 87 | [keycloak/keycloak](https://github.com/keycloak/keycloak) | Identity federation and access management. | Add institutional SSO for a partner campus; map trusted claims to server-side roles and patient identity. | evaluate | Apache-2.0; identity is not clinical authorization or consent. | N · 2026-09-14 |
| 88 | [mlflow/mlflow](https://github.com/mlflow/mlflow) | Experiment, model, and evaluation tracking. | Version OCR/NLP experiments and reviewer outcomes; store aggregate metrics and approved fixtures rather than raw PHI traces. | near-term | Apache-2.0 | N · 2026-09-14 |
| 89 | [treeverse/dvc](https://github.com/treeverse/dvc) | Dataset/artifact versioning. | Pin hashes for synthetic fixtures and authorized evaluation sets while keeping sensitive blobs outside Git. | evaluate | Apache-2.0; canonical transfer from Iterative; storage permissions remain your responsibility. | N · 2026-09-14 |
| 90 | [shap/shap](https://github.com/shap/shap) | Feature-attribution methods. | Inspect a research model for shortcut learning and surprising drivers across subgroups. | research | MIT; attribution is not causality, clinical validity, or proof of fairness. | N · 2026-09-13 |
| 91 | [fairlearn/fairlearn](https://github.com/fairlearn/fairlearn) | Model fairness assessment and mitigation. | Compare error/calibration metrics across consented, sufficiently sized evaluation groups. | evaluate | MIT; metric selection needs a specific harm model. | N · 2026-09-08 |
| 92 | [evidentlyai/evidently](https://github.com/evidentlyai/evidently) | Data/model evaluation and drift reporting. | Detect changes in lab layouts, text languages, missing values, and extraction performance. | evaluate | Apache-2.0; OSS library distinct from hosted offerings. | N · 2026-09-11 |
| 93 | [HumanSignal/label-studio](https://github.com/HumanSignal/label-studio) | Text/image/audio annotation. | Build a clinician-reviewed gold set of medication fields, symptoms, and OCR corrections. | near-term | Apache-2.0 core; enterprise features separate; secure the annotation environment. | N · 2026-09-14 |
| 94 | [cvat-ai/cvat](https://github.com/cvat-ai/cvat) | Image/video annotation and review. | Annotate consented posture/capture-quality research clips; avoid collecting more video than needed. | research | MIT core; hosted/enterprise features and connected models have separate terms. | N · 2026-09-14 |
| 95 | [pgvector/pgvector](https://github.com/pgvector/pgvector) | PostgreSQL vector similarity search. | Add source-cited retrieval beside authorized metadata; apply tenant filters and deletion propagation to embeddings. | near-term | [PostgreSQL license](https://github.com/pgvector/pgvector/blob/master/LICENSE); permissive, not MIT. | N · 2026-09-10 |
| 96 | [open-telemetry/opentelemetry-collector](https://github.com/open-telemetry/opentelemetry-collector) | Telemetry collection and processing. | Track intake-worker latency, retries, and provider failures with PHI-free identifiers and redaction. | near-term | Apache-2.0; retention/export configuration controls exposure. | N · 2026-09-11 |
| 97 | [temporalio/temporal](https://github.com/temporalio/temporal) | Durable workflow execution service. | Reconsider for long-lived referral/insurer workflows only when the current job/outbox design proves insufficient. | evaluate | MIT; substantial service/operations cost despite free code. | N · 2026-09-14 |
| 98 | [bentoml/BentoML](https://github.com/bentoml/BentoML) | Model-serving and inference application framework. | Isolate OCR/NLP model dependencies from FastAPI and implement bounded batch inference. | evaluate | Apache-2.0; hosted services and model assets separate. | N · 2026-09-07 |
| 99 | [microsoft/onnxruntime](https://github.com/microsoft/onnxruntime) | Cross-platform model inference runtime. | Benchmark an exportable, validated model on CPU/mobile targets with explicit preprocessing parity. | evaluate | MIT runtime; model conversion/operator/device support must be tested. | N · 2026-09-14 |
| 100 | [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks) | Secret detection in source and history. | Add read-only CI scanning for leaked integration credentials with a documented remediation workflow. | near-term | MIT; scanning does not rotate a leaked credential. | N · 2026-09-09 |

## Licensing, models, and clinical-use boundaries

**Open-source code does not imply open model weights, open datasets, commercial clinical-use rights, or regulatory/clinical certification.** Treat those as four separate decisions. An upstream EHR's certification, an imaging benchmark result, or a model's published accuracy does not transfer to SA Care, its population, workflow, deployment, or intended use.

Important findings from the live inspection:

- **Mixed/limited scope:** #69's MIT core is included as a code-level research candidate, but its inspected LICENSE adds restrictions for bundled SimpleBLE. A blanket “fully OSS distribution” claim would be wrong. #7, #11, #24, #29, #30, #33, and #80 also need attention to component/content-specific terms.
- **Restricted model tasks:** the [TotalSegmentator README](https://github.com/wasserth/TotalSegmentator/blob/master/README.md) distinguishes Apache-2.0 tasks from tasks requiring licenses. It also identifies a brain-aneurysm task as CC BY-NC 4.0 with no commercial license available. Pick and review the exact task; the repository badge is insufficient.
- **Terminology is independently licensed:** UMLS, SNOMED CT, LOINC, and UCUM rights/access conditions are not supplied by a client library, renderer, vocabulary mapper, or server. Confirm the intended geography, vocabulary edition, distribution, and deployment rights.
- **Missing license detection is not “unlicensed” by itself:** GitHub returned null for #15, #16, and #60; inspected project metadata declares Apache-2.0. These weaker declarations are marked in the rows. Full artifact and transitive-license status remains **unknown/unverified** until reviewed.
- **Unknown permissions block reuse:** checkpoint, instrument, data, or component rights that have not been checked stay **unknown**, rather than inheriting the code label. This applies especially to clinical BERT variants, medical-image models, PhysioNet/MIMIC-connected workflows, and standardized questionnaire content.
- **Copyleft is still open source:** GPL, AGPL, and MPL projects are included. Review the actual linking, modification, distribution, and network-use obligations for the pinned artifact; putting code behind an API is not a universal exemption.

### Candidates examined but deliberately excluded from the 100

These are evidence for exclusions, not extra catalog recommendations:

- [SeldonIO/alibi LICENSE](https://github.com/SeldonIO/alibi/blob/master/LICENSE): current Business Source License 1.1 explicitly says it is not an open-source license, with version-dependent conversion terms. Replaced by #90.
- [ubicomplab/rPPG-Toolbox LICENSE](https://github.com/ubicomplab/rPPG-Toolbox/blob/main/LICENSE): Responsible AI Source Code License includes field-of-use restrictions, including insurance-related uses. Not treated as unrestricted OSS; #67/#68 cover related experimentation with explicit licenses.
- [stanfordmlgroup/CheXbert README](https://github.com/stanfordmlgroup/CheXbert/blob/master/README.md): advertises separate commercial licensing; a sufficient unrestricted OSS grant was not established. Commercial permission remains **unknown**. The distinct rule-based CheXpert labeler is #54.
- [CogStack/MedCAT README](https://github.com/CogStack/MedCAT/blob/main/README.md): the repository is archived and says it moved to #44. Historical license-change text reinforces the need to check exact versions; the old and successor repositories were not counted twice.
- `ncbi-nlp/NCBI_BERT` resolved to #51; it was removed as a duplicate alias. OHDSI Athena's license API returned 404 and its inspected README/POM did not establish a grant; it was replaced by #16 rather than guessing a license.

## What SA Care should develop next

The main engineering work is the application contract around these projects. A library will not supply consent, provenance, review state, partner identity reconciliation, or a reliable user journey automatically.

### Phase 0 — Establish the trustworthy data boundary

**Suggested scope: first 1–2 weeks, contingent on the team's capacity and current code verification.**

- Reconcile the audit and later implementation notes against current behavior; retain real unknown/unconfigured states for unavailable providers.
- Define a normalized observation contract: authenticated patient/tenant, value, original and normalized unit, recorded/received time, source/device, acquisition method, quality, processing version, and provenance.
- Bind clinician review to the exact document/output version and assigned patient. Persist consent grants, expiry/revocation, access purpose, and audit events.
- Separate demo/synthetic fixtures, self-reports, imported measurements, and algorithmic estimates in storage and UI.
- Verify the existing persistent workflow/outbox, idempotency, bounded retry, and cancellation behavior before introducing #97.
- Use #10 for fixtures and consider #100/#96 for secrets/operational evidence.

**Exit:** cross-student/cross-campus access tests pass, revoked access fails, duplicate jobs do not duplicate actions, and a missing signal/provider never becomes a fabricated successful result.

### Phase 1 — Interoperable records and useful forms

**Suggested scope: weeks 2–5.**

- Resolve #6's FHIR-version compatibility first; pin exchange models and #9 to the chosen ABDM package/version. Use #7 as the specification source.
- Map lab results to Observation/DiagnosticReport, uploaded originals to DocumentReference/Binary, encounters to Encounter, and prescriptions to reviewed MedicationRequest structures as appropriate to partner profiles.
- Implement import preview, error explanations, provenance, duplicate detection, export receipts, and a patient-visible timeline.
- Pilot #12 for one intake form and one follow-up. Version the questionnaire and any licensed instrument independently from the UI.
- Compare #1 and #2 only if a full FHIR server is required. Keep one authoritative identity/record mapping.
- Develop the actual ABDM/partner adapter: consent flows, credentials, verified callbacks, sandbox test evidence, and error reconciliation. FHIR-valid JSON alone does not complete this work.

**Exit:** a synthetic patient round-trips through one pinned partner profile; invalid bundles fail predictably; source and consent are preserved; web/native behavior is explicit.

### Phase 2 — Lab/Rx intake and clinician-reviewed NLP

**Suggested scope: weeks 4–8, after the record boundary exists.**

- Build a durable pipeline: upload → file checks → OCR (#57, benchmark #58) → source-linked extraction (#41) → reviewer correction → approved structured record.
- Keep original page, bounding box/span, field confidence, extraction version, and reviewer decision together. Never fabricate dosage, infer prescription authorization, or automatically place an order from OCR text.
- Create a consented or synthetic gold set with #93; stratify by lab vendor, scan quality, script/language, abbreviations, and handwriting versus print.
- Evaluate medication name/strength/dose/route/frequency separately; measure false assertions and abstentions, not only aggregate OCR accuracy.
- Add #81 before research export/telemetry and #88 for experiment lineage. Verify that redaction happens before any sensitive trace is emitted.

**Exit:** clinicians can compare every proposed field with its source, reject ambiguous results, and reproduce the extraction version. Pre-agreed field-level error and review-time targets are met on a held-out set.

### Phase 3 — Evidence-based navigation and care coordination

**Suggested scope: weeks 6–10.**

- Build an approved information library with source owner, publication/review dates, jurisdiction, version, expiry, and permitted reuse. Use #56 for permitted scholarly PDFs where appropriate.
- Add #95 only when semantic retrieval improves a measured baseline. Include citations, uncertainty, “no suitable evidence,” and escalation to a care professional.
- Develop the appointment → encounter → report → referral → follow-up journey, with real partner delivery receipts and rescheduling/cancellation states.
- Keep insurer eligibility, submissions, and adjudication tied to verified partner events. Open-source health ML is not a basis for claim denial, pricing, or student risk scoring.
- Track unsupported claims, retrieval misses, stale evidence, subgroup performance, and reviewer correction rates with #88/#91/#92 as justified.

**Exit:** one partner care journey completes end to end; every clinical-information answer can point to an approved source; expired/revoked content is removed from retrieval; no generated answer executes a prescription or claim decision.

### Phase 4 — Real device observations and selective imaging

**Suggested scope: weeks 8–14, gated by partner/device access.**

- Implement native HealthKit/Health Connect or specific device adapters as separate projects; native permissions, background delivery, timestamp normalization, and device testing remain to be done. This catalog does not claim those integrations are already solved.
- Use #61/#62/#65/#68 for signal-quality baselines. Record calibration/reference method, accepted/rejected windows, sampling rate, and uncertainty.
- Keep camera pulse (#67) experimental; evaluate across devices, motion, lighting, and skin tones. Do not derive blood pressure, oxygen saturation, diagnosis, or emergency reassurance without an independently validated method for that exact use.
- Add a DICOMweb viewer (#21) only with a real imaging partner and a clear clinician need. Use #24/#28 for backend metadata/transport; #27 for reviewed structured outputs.
- Keep image-derived proposals and original reports visibly distinct. Annotation and model experiments (#35–#40) remain separate until a clinical validation plan succeeds.

**Exit:** source/quality metadata survives acquisition to display; failed capture yields no reading; a reference-device study supports the intended measurement; imaging access is patient-scoped and audited.

### Phase 5 — Optional biomedical research program

**Suggested scope: after the preceding workflows succeed; not a release commitment.**

- For longitudinal outcomes, establish a governed OMOP export (#15/#16/#60) and patient/time/campus-separated evaluation (#71–#73).
- Consider federated/private methods (#82–#85) only with a specified privacy threat model, agreement on outputs, and expertise to verify the accounting.
- Run imaging, neurophysiology, genomics, and therapeutics projects only with a named academic/clinical partner, authorized data, and a concrete research question.
- Pin datasets/model artifacts with #89 and isolate serving with #98/#99 if deployment is eventually justified. Maintain a rollback path and independently reviewed intended-use statement.

**Exit:** authorized data and asset rights, reproducible evaluation, documented subgroup/shift behavior, and a separate decision on whether any result is suitable for clinical use. A paper reproduction is not that decision.

## Verification record and limitations

### What was checked

- **Live GitHub REST metadata for all 100 final repositories:** existence, returned canonical `full_name`/URL, detected license where available, default branch, `archived`, `disabled`, and `pushed_at`. All were reachable through the API; #66 was archived. `N` and the date in each row preserve the relevant status snapshot.
- **License follow-up:** inspected license texts for ambiguous `NOASSERTION` results and project declarations where the license endpoint returned 404. Follow-up sources are linked directly in the rows. Read the special-license sources above rather than treating a README badge as a blanket asset grant.
- **Deeper relevance checks:** fetched README content for all ten practical priorities, plus selected licensing/maintenance-sensitive candidates. Consulted current Medplum architecture documentation and the official ABDM guide. Other purpose descriptions rely primarily on repository descriptions and established project scope; every package API was not audited.
- **Structural checks:** checked consecutive catalog numbers 1–100, exactly 100 case-insensitively unique canonical repository links, complete seven-column rows, valid tier labels, and metadata agreement for canonical names, archive flags, and push dates. Supporting source links and exclusions are not counted as catalog entries.
- **Scope:** documentation only; no dependency installation, model/data download, application edit, production change, or GitHub write operation.

The metadata source for any row can be re-queried read-only with `gh api repos/OWNER/REPO`. Relevant fields are `full_name`, `html_url`, `default_branch`, `archived`, `disabled`, `pushed_at`, and `license.spdx_id`. For detected-license failures, inspect the exact file linked in that row; `NOASSERTION` is not a license name. License file and README URLs track mutable branches, so recheck the pinned commit/release before adoption.

### What this research does not establish

- No dependency resolution, compilation, integration tests, load tests, security audit, or clinical benchmarking of these 100 projects was performed. Existing SA Care tests were not rerun for this documentation-only change.
- A recent push is not evidence of a maintained release, responsive maintainers, safe dependencies, or production support. Release cadence, issue-response time, bus factor, supply-chain integrity, and every repository's branch history were not measured.
- API reachability was checked for each repository, not every outbound documentation link, package registry artifact, model download, or dataset URL.
- SPDX labels and selected source inspection are not a complete transitive/component license review. Rights for uninspected weights, datasets, instruments, and hosted services remain **unknown**. #69 is explicitly an OSS-core/mixed-distribution candidate; it is not a fully open binary-stack endorsement.
- No HIPAA/DPDP compliance, ABDM onboarding, insurer acceptance, medical-device clearance, or commercial clinical certification is implied. Those depend on SA Care's actual intended use, jurisdiction, contracts, implementation, validation, and operation.

**Next decision:** fund the Phase 0–2 record/intake workflow and its evaluation set. Revisit the wider shortlist when a measured bottleneck or a named provider/research partner creates a concrete requirement.
