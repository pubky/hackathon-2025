/**
 * Converts a standard auth URL to a Pubky Ring deep link format.
 * The deep link format is: pubkyring://pubkyauth///?caps=...&secret=...&relay=...
 */
export function convertToRingURL(url: string): string {
  try {
    const parsedUrl = new URL(url);
    const params = new URLSearchParams(parsedUrl.search);

    // Extract the parameters from the auth URL
    const caps = params.get('caps') || '/pub/consentky.app/:rw';
    const secret = params.get('secret') || '';
    const relay = params.get('relay') || parsedUrl.href.split('?')[0];

    // Build the pubkyring deep link in the correct format
    const ringParams = new URLSearchParams();
    ringParams.set('caps', caps);
    if (secret) ringParams.set('secret', secret);
    ringParams.set('relay', relay);

    // Preserve any additional parameters like pendingJoin
    const pendingJoin = params.get('pendingJoin');
    if (pendingJoin) ringParams.set('pendingJoin', pendingJoin);

    const ringUrl = `pubkyring://pubkyauth///?${ringParams.toString()}`;
    console.log('[DeepLink] Converting URL:', {
      original: url,
      converted: ringUrl,
      params: { caps, secret: secret ? `${secret.substring(0, 10)}...` : '', relay, pendingJoin }
    });

    return ringUrl;
  } catch (error) {
    console.error('Failed to convert to Ring URL:', error);
    return url;
  }
}
