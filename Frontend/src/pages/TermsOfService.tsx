import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose lg:prose-xl">
        <h2 className="text-2xl font-semibold mt-6">Acceptance of Terms</h2>
        <p>By accessing and using WiWaste ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.</p>
        
        <h2 className="text-2xl font-semibold mt-6">Description of Service</h2>
        <p>WiWaste is a mobile application designed to help Philippine SMEs manage their inventory, sales, purchasing, and compliance with food safety and data privacy regulations.</p>
        
        <h2 className="text-2xl font-semibold mt-6">User Accounts</h2>
        <p>To access certain features of the Service, you may need to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</p>
        
        <h2 className="text-2xl font-semibold mt-6">User Responsibilities</h2>
        <p>You are responsible for:</p>
        <ul className="list-disc list-inside">
          <li>Maintaining the confidentiality of your account and password</li>
          <li>All activities that occur under your account</li>
          <li>Complying with all applicable laws and regulations, including but not limited to RA 10173 (Data Privacy Act), RA 10611 (Food Safety Act), RA 7394 (Consumer Act), RA 9994/10754 (Senior Citizens Act), and RA 10918 (Pharmacy Act)</li>
          <li>Not using the Service for any unlawful purpose</li>
          <li>Not interfering with or disrupting the Service or servers connected to the Service</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Intellectual Property</h2>
        <p>The Service and its original content, features, and functionality are and will remain the exclusive property of WiWaste and its licensors. The Service is protected by copyright, trademark, and other laws of both the Philippines and foreign countries.</p>
        
        <h2 className="text-2xl font-semibold mt-6">Limitation of Liability</h2>
        <p>In no event shall WiWaste, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from:</p>
        <ul className="list-disc list-inside">
          <li>Your access to or use of or inability to access or use the Service;</li>
          <li>Any conduct or content of any third party on the Service;</li>
          <li>Any content obtained from the Service; and</li>
          <li>Unauthorized access, use or alteration of your transmissions or content.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-6">Governing Law</h2>
        <p>These Terms shall be governed and construed in accordance with the laws of the Philippines, without regard to its conflict of law principles.</p>
        
        <h2 className="text-2xl font-semibold mt-6">Changes to Terms</h2>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.</p>
        
        <h2 className="text-2xl font-semibold mt-6">Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us:</p>
        <ul className="list-disc list-inside">
          <li>Email: [legal@wiwaste.com]</li>
          <li>Phone: [+63 XXX XXXX]</li>
          <li>Address: [Business Address]</li>
        </ul>
      </div>
    </div>
  );
};

export default TermsOfService;