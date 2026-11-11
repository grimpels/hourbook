import * as OTPAuth from 'otpauth';

const ISSUER = 'Hourbook';

export function newSecret(): string {
	return new OTPAuth.Secret({ size: 20 }).base32;
}

function totp(secret: string, label: string) {
	return new OTPAuth.TOTP({
		issuer: ISSUER,
		label,
		algorithm: 'SHA1',
		digits: 6,
		period: 30,
		secret: OTPAuth.Secret.fromBase32(secret)
	});
}

export function totpUri(secret: string, username: string): string {
	return totp(secret, username).toString();
}

// window: 1 => se accepta si codul precedent/urmator, pentru ceasuri usor decalate.
export function verifyTotp(secret: string, code: string): boolean {
	if (!/^\d{6}$/.test(code)) return false;
	return totp(secret, 'x').validate({ token: code, window: 1 }) !== null;
}
