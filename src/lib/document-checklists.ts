export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

export interface StreamChecklist {
  stream: string;
  label: string;
  description: string;
  items: ChecklistItem[];
}

export const PR_STREAM_CHECKLISTS: StreamChecklist[] = [
  {
    stream: "cec",
    label: "Canadian Experience Class (CEC)",
    description: "For skilled workers with at least 12 months of Canadian work experience.",
    items: [
      { key: "passport", label: "Valid Passport", description: "Must be valid for at least 6 months beyond your planned travel date", required: true },
      { key: "language_test", label: "Language Test Results (IELTS General / CELPIP / PTE Core)", description: "CLB 7+ for TEER 0/1, CLB 5+ for TEER 2/3. Must be less than 2 years old.", required: true },
      { key: "employment_letters", label: "Canadian Employment Reference Letters", description: "On company letterhead: job title, duties, hours/week, salary, dates of employment", required: true },
      { key: "pay_stubs", label: "Recent Pay Stubs (3-6 months)", description: "Proves employment continuity and wage", required: true },
      { key: "t4_tax", label: "T4 Slips & Notice of Assessment (NOA)", description: "From CRA for each year you worked in Canada", required: true },
      { key: "police_clearance", label: "Police Clearance Certificate", description: "From every country you lived in 6+ months since age 18", required: true },
      { key: "medical_exam", label: "Immigration Medical Exam (IME)", description: "Must be done by an IRCC-designated panel physician", required: true },
      { key: "photos", label: "Passport-size Photos", description: "2 photos meeting IRCC specifications", required: true },
      { key: "proof_of_funds", label: "Proof of Settlement Funds", description: "Bank statements showing minimum required funds (not required if currently working in Canada with valid job offer)", required: false },
      { key: "work_permit_copy", label: "Current/Previous Work Permit Copies", description: "All work permits issued to you in Canada", required: true },
      { key: "digital_photo", label: "Digital Photo for E-Application", description: "JPEG format meeting IRCC specifications", required: true },
      { key: "birth_certificate", label: "Birth Certificate", description: "Original or certified copy with English/French translation if needed", required: true },
    ],
  },
  {
    stream: "fsw",
    label: "Federal Skilled Worker (FSW)",
    description: "For skilled workers with foreign work experience. Must score 67+ on the FSW points grid.",
    items: [
      { key: "passport", label: "Valid Passport", description: "Must be valid for at least 6 months", required: true },
      { key: "language_test", label: "Language Test Results (IELTS General / CELPIP / PTE Core)", description: "Minimum CLB 7 in all four abilities", required: true },
      { key: "eca_report", label: "Educational Credential Assessment (ECA)", description: "From WES, IQAS, or other designated organization. Must be less than 5 years old.", required: true },
      { key: "employment_letters", label: "Employment Reference Letters", description: "For all listed work experience — duties, hours, dates, job title", required: true },
      { key: "police_clearance", label: "Police Clearance Certificate", description: "From every country lived in 6+ months since age 18", required: true },
      { key: "medical_exam", label: "Immigration Medical Exam (IME)", description: "By IRCC-designated panel physician", required: true },
      { key: "proof_of_funds", label: "Proof of Settlement Funds", description: "Bank statements for 6+ months showing minimum required amount", required: true },
      { key: "photos", label: "Passport-size Photos", description: "2 photos meeting IRCC specifications", required: true },
      { key: "birth_certificate", label: "Birth Certificate", description: "With translation if not in English/French", required: true },
      { key: "education_docs", label: "Education Documents (Degrees, Transcripts)", description: "Original certificates and transcripts", required: true },
      { key: "second_language", label: "Second Language Test (French TEF/TCF)", description: "Optional but adds CRS points", required: false },
    ],
  },
  {
    stream: "pnp",
    label: "Provincial Nominee Program (PNP)",
    description: "Nomination from a Canadian province. Requirements vary by province and stream.",
    items: [
      { key: "passport", label: "Valid Passport", description: "Valid for at least 6 months", required: true },
      { key: "language_test", label: "Language Test Results", description: "Minimum CLB 4-7 depending on province/stream", required: true },
      { key: "pnp_nomination", label: "Provincial Nomination Certificate", description: "Issued by the province that nominated you", required: true },
      { key: "employment_letters", label: "Employment Reference Letters", description: "For relevant work experience", required: true },
      { key: "job_offer", label: "Job Offer Letter (if required by stream)", description: "From a Canadian employer in the province", required: false },
      { key: "police_clearance", label: "Police Clearance Certificate", description: "From all countries lived in 6+ months", required: true },
      { key: "medical_exam", label: "Immigration Medical Exam", description: "By designated physician", required: true },
      { key: "education_docs", label: "Education Documents / ECA", description: "Degrees, transcripts, and ECA if foreign credentials", required: true },
      { key: "proof_of_funds", label: "Proof of Settlement Funds", description: "May be required depending on stream", required: false },
      { key: "photos", label: "Passport-size Photos", description: "Meeting IRCC specifications", required: true },
      { key: "provincial_docs", label: "Province-Specific Documents", description: "Varies by province — check your PNP stream requirements", required: true },
    ],
  },
  {
    stream: "pgwp",
    label: "Post-Graduation Work Permit (PGWP)",
    description: "For international graduates of eligible Canadian institutions.",
    items: [
      { key: "passport", label: "Valid Passport", description: "Must be valid at time of application", required: true },
      { key: "study_permit", label: "Current Study Permit (or proof of valid status)", description: "Must be valid or within 180 days of expiry", required: true },
      { key: "completion_letter", label: "Letter of Completion from Institution", description: "Confirming you completed your program and are eligible to graduate", required: true },
      { key: "transcripts", label: "Official Transcripts", description: "Showing all courses and grades", required: true },
      { key: "photos", label: "Passport-size Photos", description: "Meeting IRCC specifications", required: true },
      { key: "language_test", label: "Language Test Results (for programs ending after Nov 1, 2024)", description: "May be required for PGWP eligibility depending on your program", required: false },
      { key: "field_of_study_letter", label: "Field of Study Documentation", description: "For programs requiring specific fields under new PGWP rules", required: false },
    ],
  },
];

export function getChecklistForStream(stream: string): StreamChecklist | undefined {
  return PR_STREAM_CHECKLISTS.find(c => c.stream === stream);
}
