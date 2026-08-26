import 'dotenv/config'
import * as brevo from '@getbrevo/brevo'

const apiInstance = new brevo.TransactionalEmailsApi()
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY)

export async function sendMail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY is not set in .env')
    return
  }
  if (!process.env.BREVO_FROM_EMAIL) {
    console.error('❌ BREVO_FROM_EMAIL is not set in .env')
    return
  }
  if (!to) {
    console.error('❌ sendMail called with no recipient (to is empty)')
    return
  }

  try {
    console.log(`📧 Sending email → to: ${to} | subject: ${subject}`)

    const email = new brevo.SendSmtpEmail()
    email.sender      = { email: process.env.BREVO_FROM_EMAIL, name: 'OUI Clearance' }
    email.to          = [{ email: to }]
    email.subject     = subject
    email.htmlContent = html

    const response = await apiInstance.sendTransacEmail(email)

    console.log(`✅ Mail sent to ${to} | messageId: ${response.body?.messageId || 'n/a'}`)
  } catch (err) {
    const detail = err.response?.body?.message || err.message
    console.error(`❌ Brevo error for ${to}:`, detail)
  }
}

// ── Email templates ──
export const templates = {
  welcome: (name, verifyUrl) => ({
    subject: 'Welcome to OUI Clearance — Verify your email',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#0D1B3E;font-family:Georgia,serif">Welcome, ${name}</h2>
        <p style="color:#4B5680;line-height:1.7">Your OUI Clearance account has been created. Click below to verify your email address and activate your account.</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#0D1B3E;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
        <p style="color:#8A94B0;font-size:12px">If you did not create an account, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#8A94B0;font-size:12px">Oduduwa University Clearance System · Ipetumodu, Osun State</p>
      </div>
    `,
  }),

  stageUpdate: (studentName, stageName, status, remark) => ({
    subject: `Clearance Update — ${stageName} ${status === 'approved' ? 'Approved' : 'Queried'}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#0D1B3E;font-family:Georgia,serif">Clearance Update</h2>
        <p style="color:#4B5680;line-height:1.7">Dear <strong>${studentName}</strong>,</p>
        <p style="color:#4B5680;line-height:1.7">Your <strong>${stageName}</strong> stage has been
          <strong style="color:${status === 'approved' ? '#059669' : '#DC2626'}">
            ${status === 'approved' ? 'approved' : 'queried'}
          </strong>.
        </p>
        ${remark
          ? `<div style="background:#F3F0E6;border-radius:8px;padding:12px 16px;margin:16px 0">
               <p style="color:#4B5680;margin:0"><strong>Remark:</strong> ${remark}</p>
             </div>`
          : ''
        }
        <a href="${process.env.CLIENT_URL}/student/track"
           style="display:inline-block;margin:24px 0;padding:12px 28px;background:#0D1B3E;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Clearance Status
        </a>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#8A94B0;font-size:12px">Oduduwa University Clearance System</p>
      </div>
    `,
  }),

  cleared: (studentName, letterId, grantedDate) => ({
    subject: 'Congratulations — You are Fully Cleared!',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#A67C00;font-family:Georgia,serif">You are Fully Cleared!</h2>
        <p style="color:#4B5680;line-height:1.7">Dear <strong>${studentName}</strong>,</p>
        <p style="color:#4B5680;line-height:1.7">
          Congratulations! You have been officially cleared by Oduduwa University for the 2025/2026 academic session.
        </p>
        <div style="background:#F3F0E6;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 6px;color:#8A94B0;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Certificate ID</p>
          <p style="margin:0;font-family:monospace;font-weight:700;color:#0D1B3E;font-size:16px">${letterId}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#8A94B0">Issued: ${grantedDate}</p>
        </div>
        <a href="${process.env.CLIENT_URL}/student/letter"
           style="display:inline-block;margin:24px 0;padding:12px 28px;background:#A67C00;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Download Clearance Letter
        </a>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#8A94B0;font-size:12px">Oduduwa University Clearance System · Ipetumodu, Osun State</p>
      </div>
    `,
  }),

  adminFinalNotification: (studentName, matric) => ({
    subject: `Final Clearance Required — ${studentName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px">
        <h2 style="color:#0D1B3E;font-family:Georgia,serif">Final Clearance Pending</h2>
        <p style="color:#4B5680;line-height:1.7">
          <strong>${studentName}</strong> (${matric}) has received HOD departmental sign-off.
          The file is now ready for your final review and clearance grant.
        </p>
        <a href="${process.env.CLIENT_URL}/admin/final"
           style="display:inline-block;margin:24px 0;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Grant Final Clearance
        </a>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
        <p style="color:#8A94B0;font-size:12px">Oduduwa University Clearance System</p>
      </div>
    `,
  }),
}