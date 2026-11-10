export const FIELDS = ['company_name','contact_name','job_title','phone','email1','email2','email3','linkedin_url','website','industry','country','city','notes'] as const;
export type Field = typeof FIELDS[number];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const SYN: Record<Field, string[]> = {
  company_name: ['companyname','company','businessname','business','organization','organisation','account','firm'],
  contact_name: ['contactname','contact','fullname','name','personname'],
  job_title: ['jobtitle','title','position','role'],
  phone: ['phone','phonenumber','mobile','mobilenumber','tel','telephone','cell','contactnumber'],
  email1: ['email','email1','emailaddress','workemail','primaryemail','mail'],
  email2: ['email2','secondemail','secondaryemail','alternateemail','personalemail'],
  email3: ['email3','thirdemail','otheremail','additionalemail'],
  linkedin_url: ['linkedin','linkedinurl','linkedinprofile','linkedinprofilelink','linkedinlink'],
  website: ['website','url','site','web','domain','companywebsite','websiteurl','homepage'],
  industry: ['industry','sector','vertical','category'], country: ['country','nation'], city: ['city','town','location'],
  notes: ['notes','note','comments','remarks','description'],
};
export function autoMap(headers: string[]): Partial<Record<Field, number>> {
  const keys = headers.map(norm); const map: Partial<Record<Field, number>> = {}; const used = new Set<number>();
  for (const f of FIELDS) for (const s of SYN[f]) { const i = keys.findIndex((k, j) => !used.has(j) && k === s); if (i >= 0) { map[f] = i; used.add(i); break; } }
  return map;
}
export const csvCell = (v: unknown) => { let s = String(v ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
