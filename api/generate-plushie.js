export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageBase64, skinTone, features, material, scene, customNotes } = req.body;

        // Build the structured prompt for the AI image generator
        let prompt = `Ultra-soft, round, marshmallow-like giant squishy plushie avatar. `;
        prompt += `Made of ${material || 'ultra-soft fleece'} material. `;
        prompt += `Skin tone: ${skinTone}. `;

        if (features && features.length > 0) {
            prompt += `Features: ${features.join(', ')}. `;
        }

        prompt += `Simple embroidered dot eyes and a tiny stitched smile. `;
        prompt += `Setting: ${scene}. `;

        if (customNotes) {
            prompt += `Additional detail: ${customNotes}. `;
        }

        // Call AI Image Provider (using environment variable key stored in Vercel)
        const apiResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "stability-ai/sdxl:39ed52f2a78e93338771e87210772f050c06f459be2acb450b5b2d7e53b70c08",
                input: { prompt: prompt }
            })
        });

        const data = await apiResponse.json();

        return res.status(200).json({
            success: true,
            imageUrl: data.output ? data.output[0] : null
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
