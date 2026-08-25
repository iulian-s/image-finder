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