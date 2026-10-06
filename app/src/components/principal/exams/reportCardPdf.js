import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Report card -> PDF -> system share sheet (or print dialog). Every value is
// HTML-escaped because names are school-entered text.
const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function reportCardHtml({ card, schoolName, accent = '#4F46E5' }) {
  const { exam, student, result } = card;
  const body = (result.subjectResults || [])
    .map(
      (s) => `<tr><td><b>${esc(s.subjectName)}</b></td><td class="r">${esc(s.maxMarks)}</td><td class="r">${esc(s.passingMarks)}</td>
      <td class="r"><b>${esc(s.attendanceStatus === 'PRESENT' ? s.marksObtained : s.attendanceStatus)}</b></td>
      <td class="c">${esc(s.grade)}</td><td class="c ${s.isPassed ? 'ok' : 'bad'}">${s.isPassed ? 'PASS' : 'FAIL'}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  * { box-sizing: border-box; } body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 28px; font-size: 13px; }
  .head { text-align: center; border-bottom: 3px solid ${accent}; padding-bottom: 12px; margin-bottom: 16px; }
  .school { font-size: 20px; font-weight: 800; color: ${accent}; text-transform: uppercase; } .tag { font-size: 11px; color: #64748B; letter-spacing: 2px; margin-top: 4px; }
  .exam { display: inline-block; margin-top: 8px; background: #F1F5F9; border-radius: 99px; padding: 4px 12px; font-weight: 700; font-size: 12px; }
  .grid { display: flex; flex-wrap: wrap; background: #F8FAFC; border-radius: 10px; padding: 10px 14px; margin-bottom: 14px; } .cell { width: 50%; padding: 5px 0; }
  .k { color: #64748B; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; } .v { font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 10px; color: #475569; text-transform: uppercase; background: #F1F5F9; padding: 8px; }
  td { padding: 8px; border-bottom: 1px solid #E2E8F0; } .r { text-align: right; } .c { text-align: center; } .ok { color: #16A34A; font-weight: 800; } .bad { color: #DC2626; font-weight: 800; }
  .sum { display: flex; justify-content: space-between; margin-top: 16px; border: 1px solid ${accent}; border-radius: 10px; padding: 12px 16px; }
  .sum .x { font-size: 17px; font-weight: 800; margin-top: 2px; }
  .sig { display: flex; justify-content: space-between; margin-top: 56px; text-align: center; font-size: 11px; font-weight: 700; color: #64748B; } .sig div { width: 28%; border-top: 1px solid #94A3B8; padding-top: 4px; }
</style></head><body>
  <div class="head"><div class="school">${esc(schoolName || 'School')}</div><div class="tag">ACADEMIC REPORT AND PERFORMANCE EVALUATION</div>
    <div class="exam">${esc(exam.name)} &bull; Session ${esc(exam.session)}</div></div>
  <div class="grid">
    <div class="cell"><div class="k">Student name</div><div class="v">${esc(student.name)}</div></div>
    <div class="cell"><div class="k">Roll number</div><div class="v">${esc(student.rollNumber)}</div></div>
    <div class="cell"><div class="k">Class and section</div><div class="v">${esc(student.className)} - ${esc(student.sectionName)}</div></div>
    <div class="cell"><div class="k">Admission no</div><div class="v">${esc(student.admissionNumber)}</div></div>
  </div>
  <table><thead><tr><th>Subject</th><th class="r">Max</th><th class="r">Passing</th><th class="r">Obtained</th><th class="c">Grade</th><th class="c">Status</th></tr></thead><tbody>${body}</tbody></table>
  <div class="sum">
    <div><div class="k">Aggregate</div><div class="x">${esc(result.totalMarks)} / ${esc(result.maxTotalMarks)}</div></div>
    <div><div class="k">Percentage</div><div class="x">${esc(result.percentage)}%</div></div>
    <div><div class="k">Class rank</div><div class="x">#${esc(result.rank || '-')}</div></div>
    <div><div class="k">Outcome</div><div class="x ${result.outcome === 'PASS' ? 'ok' : 'bad'}">${esc(result.outcome)}</div></div>
  </div>
  <div class="sig"><div>Class Teacher</div><div>Exam Controller</div><div>Principal</div></div>
</body></html>`;
}

export async function shareReportCardPdf(args) {
  const html = reportCardHtml(args);
  const { uri } = await Print.printToFileAsync({ html });
  if (!(await Sharing.isAvailableAsync())) {
    await Print.printAsync({ html });
    return;
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Report card - ${args.card.student.name}`,
  });
}
