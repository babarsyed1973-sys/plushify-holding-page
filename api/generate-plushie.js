export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageBase64, skinTone, features, material, scene, customNotes } = req.body;

        // Construct structured prompt
        let prompt = `Ultra-soft, round, marshmallow-like giant squishy plushie avatar. `;
        prompt += `Made of ${material || 'ultra-soft fleece'} material. `;
        prompt += `Skin tone: ${skinTone || 'medium'}. `;
        
        if (features && features.length > 0) {
            prompt += `Features: ${features.join(', ')}. `;
        }
        
        prompt += `Simple embroidered dot eyes and a tiny stitched smile. `;
        prompt += `Setting: ${scene || 'minimalist studio'}. `;
        
        if (customNotes) {
            prompt += `Additional detail: ${customNotes}. `;
        }

        // 1. Start the prediction job on Replicate
        const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                version: "39ed52f2a78e93338771e87210772f050c06f459be2acb450b5b2d7e53b70c08",
                input: { prompt: prompt }
            })
        });

        let prediction = await startResponse.json();

        if (startResponse.status !== 201) {
            return res.status(500).json({ error: prediction.detail || 'Failed to start image generation on Replicate.' });
        }

        // 2. Poll the prediction URL until the image generation completes
        const pollUrl = prediction.urls.get;

        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
            const checkResponse = await fetch(pollUrl, {
                headers: {
                    "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });
            prediction = await checkResponse.json();
        }

        if (prediction.status === "failed") {
            return res.status(500).json({ error: "Replicate image generation task failed." });
        }

        // 3. Return the completed output image URL
        const imageUrl = prediction.output ? prediction.output[0] : null;

        if (!imageUrl) {
            return res.status(500).json({ error: "No image output generated." });
        }

        return res.status(200).json({
            success: true,
            imageUrl: imageUrl
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
