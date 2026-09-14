import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      
      <div className="prose lg:prose-xl">
        <h2 className="text-2xl font-semibold mt-6">Introduction</h2>
        <p>WiWaste is committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our mobile application and website.</p>
        
        <h2 className="text-2xl font-semibold mt-6">Information We Collect</h2>
        <p>We may collect various types of information, including:</p>
        <ul className="list-disc list-inside">
          <li>Personal Information: name, email address, phone number, etc.</li>
          <li>Business Information: business name, address, tax ID, etc.</li>
          <li>Employee Information: for payroll and HR purposes (if applicable)</li>
          <li>Supplier Information: for procurement and regulatory compliance</li>
          <li>Usage Data: information about how you use our service</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">How We Use Your Information</h2>
        <p>We use your information for the following purposes:</p>
        <ul className="list-disc list-inside">
          <li>To provide, maintain, and improve our services</li>
          <li>To process transactions and send order confirmations</li>
          <li>To comply with legal obligations (including RA 10173, RA 10611, RA 7394, RA 9994/10754, and RA 10918)</li>
          <li>To send you important notices about your account or our services</li>
          <li>For internal business purposes, such as auditing, data analysis, and research</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Legal Basis for Processing</h2>
        <p>We process your personal data based on the following legal grounds:</p>
        <ul className="list-disc list-inside">
          <li>Contract: Necessary for the performance of a contract with you</li>
          <li>Legal Obligation: Required to comply with Philippine laws and regulations</li>
          <li>Legitimate Interest: For our legitimate business interests, provided they do not override your rights</li>
          <li>Consent: When you have given us explicit consent for specific purposes</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Data Sharing and Disclosure</h2>
        <p>We may share your information with:</p>
        <ul className="list-disc list-inside">
          <li>Service providers (payment gateways, delivery services, accounting systems)</li>
          <li>Government agencies (as required by law, such as BIR, FDA, NPC)</li>
          <li>Professional advisors (lawyers, accountants, auditors)</li>
          <li>Other third parties only with your consent or as required by law</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Your Rights Under RA 10173 (Data Privacy Act)</h2>
        <p>You have the right to:</p>
        <ul className="list-disc list-inside">
          <li>Access your personal data</li>
          <li>Request correction of inaccurate or incomplete data</li>
          <li>Request deletion or removal of your personal data</li>
          <li>Object to processing of your personal data</li>
          <li>Request restriction or blocking of processing of your personal data</li>
          <li>Data portability (receive your data in a structured, commonly used format)</li>
          <li>Be notified of any breach affecting your personal data</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Data Retention</h2>
        <p>We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. Specific retention periods include:</p>
        <ul className="list-disc list-inside">
          <li>Customer PII: 7 years after the end of the business relationship</li>
          <li>Employee Data: 7 years after termination of employment</li>
          <li>Supplier Data: 7 years after the end of the business relationship</li>
          <li>FDA License Information: 5 years after expiry</li>
          <li>Business Records: 10 years for tax and audit purposes</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Data Security</h2>
        <p>We implement appropriate technical and organizational measures to protect your personal data against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. These measures include:</p>
        <ul className="list-disc list-inside">
          <li>Encryption at rest and in transit</li>
          <li>Access controls and authentication mechanisms</li>
          <li>Regular security assessments and vulnerability testing</li>
          <li>Employee training on data protection and privacy</li>
          <li>Incident response and breach notification procedures</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Cookies and Similar Technologies</h2>
        <p>We use cookies and similar technologies to enhance your experience, analyze site usage, and support our marketing efforts. You can control cookies through your browser settings.</p>
        
        <h2 className="text-2xl font-semibold mt-6">International Data Transfers</h2>
        <p>We primarily store and process data within the Philippines. If we transfer data outside the Philippines, we ensure adequate safeguards are in place, such as standard contractual clauses or binding corporate rules.</p>
        
        <h2 className="text-2xl font-semibold mt-6">Changes to This Privacy Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
        
        <h2 className="text-2xl font-semibold mt-6">Contact Information</h2>
        <p>If you have any questions about this Privacy Policy or our data practices, please contact our Data Protection Officer:</p>
        <ul className="list-disc list-inside">
          <li>Name: [DPO Name]</li>
          <li>Email: [dpo@wiwaste.com]</li>
          <li>Phone: [+63 XXX XXXX]</li>
          <li>Address: [Business Address]</li>
        </ul>
        
        <p className="mt-6"><em>Last Updated: September 12, 2026</em></p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;