<#macro emailLayout>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { margin: 0; padding: 0; background-color: #f4f5f7; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        .wrapper { background-color: #f4f5f7; padding: 40px 0; width: 100%; }
        .container { background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); overflow: hidden; width: 600px; margin: 0 auto; }
        .header { background-color: #0f172a; padding: 40px 0; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 2px; }
        .header p { color: #94a3b8; margin: 10px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 40px 50px; color: #475569; font-size: 16px; line-height: 1.6; }
        .content a { display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: bold; font-size: 16px; text-decoration: none; padding: 14px 32px; border-radius: 6px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.25); margin: 20px 0; text-align: center; }
        .footer { background-color: #f8fafc; padding: 30px 50px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5; }
    </style>
</head>
<body>
    <div class="wrapper">
        <table class="container" border="0" cellpadding="0" cellspacing="0">
            <tr>
                <td class="header">
                    <h1>SOC AI SEARCH</h1>
                    <p>Security Operations Center</p>
                </td>
            </tr>
            <tr>
                <td class="content">
                    <#nested>
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <p>If you did not expect this email, please ignore it or contact your security administrator.</p>
                    <p>&copy; 2026 SOC AI Search. All rights reserved.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
</#macro>
