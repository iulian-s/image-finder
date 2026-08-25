import TextRecognition from "@react-native-ml-kit/text-recognition";

export async function extractTextFromImage(imageUri: string): Promise<string>{
    try{
        const result = await TextRecognition.recognize(imageUri);
        return result.text || "";
    } catch(err){
        console.error('OCR ERROR:', err);
        return '';
    }
}

export function isValidMemeText(rawText: string): boolean {
    if (!rawText) return false;

    // 1. Remove all whitespace and newlines
    const trimmed = rawText.trim();

    // 2. Minimum length check: Real memes almost always have at least 3-4 letters
    if (trimmed.length < 3) return false;

    // 3. Extract only alphanumeric characters (letters and numbers)
    const alphanumericOnly = trimmed.replace(/[^a-zA-Z0-9]/g, '');

    // 4. If fewer than 3 actual letters/numbers exist, it's just noise/symbols
    if (alphanumericOnly.length < 3) return false;

    // 5. Letter ratio test: Ensure at least 40% of the string consists of letters
    // (prevents random symbol noise like "|/._-~\\:")
    const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    if (letterCount / trimmed.length < 0.4) return false;

    return true;
}