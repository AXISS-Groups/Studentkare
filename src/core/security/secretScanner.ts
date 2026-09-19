/**
 * Studentkare — P70 Secret Scanner Engine
 * Scans code files, configs, and payloads for hardcoded credentials, API keys, and private keys.
 */

export interface SecretScanFinding {
  ruleId: string;
  patternName: string;
  matchedSnippet: string;
  lineNumber?: number;
}

export class SecretScanner {
  private static instance: SecretScanner;

  private secretPatterns: Array<{ name: string; regex: RegExp }> = [
    { name: 'Generic API Key (sk_live / sk_test)', regex: /sk_(live|test)_[0-9a-zA-Z]{16,}/i },
    { name: 'Google API Key', regex: /AIzaSy[0-9a-zA-Z-_]{33}/ },
    { name: 'GitHub Personal Access Token', regex: /ghp_[0-9a-zA-Z]{36}/ },
    { name: 'AWS Access Key ID', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
    { name: 'RSA/EC Private Key Header', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/ },
    { name: 'Hardcoded Bearer JWT Token', regex: /Bearer\s+eyJ[A-Za-z0-9-_=]+\.ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]+/ },
  ];

  private constructor() {}

  public static getInstance(): SecretScanner {
    if (!SecretScanner.instance) {
      SecretScanner.instance = new SecretScanner();
    }
    return SecretScanner.instance;
  }

  /**
   * Scans a text buffer or file content string for embedded hardcoded secrets.
   */
  public scanContent(content: string): SecretScanFinding[] {
    const findings: SecretScanFinding[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of this.secretPatterns) {
        const match = pattern.regex.exec(line);
        if (match) {
          findings.push({
            ruleId: 'P70_SECRET_LEAK',
            patternName: pattern.name,
            matchedSnippet: match[0].substring(0, 12) + '...',
            lineNumber: i + 1,
          });
        }
      }
    }

    return findings;
  }
}
