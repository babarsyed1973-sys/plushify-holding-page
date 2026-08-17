export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageBase64, skinTone, features, material, scene, customNotes } = req.body;

        const rawToken = process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.trim() : '';

        if (!rawToken) {
            return res.status(500).json({ error: 'REPLICATE_API_TOKEN is missing in Vercel environment variables.' });
        }

        const authHeader = rawToken.startsWith('Bearer ') || rawToken.startsWith('Token ')
            ? rawToken
            : `Bearer ${rawToken}`;

        // Build structured prompt
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

        // Call the model route directly (no version string needed)
        const startResponse = await fetch("https://api.replicate.com/v1/models/stability-ai/sdxl/predictions", {
            method: "POST",
            headers: {
                "Authorization": authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                input: { 
                    prompt: prompt,
                    scheduler: "K_EULER",
                    num_outputs: 1,
                    guidance_scale: 7.5,
                    num_inference_steps: 25
                }
            })
        });

        let prediction = await startResponse.json();

        if (startResponse.status !== 201 && startResponse.status !== 200) {
            return res.status(500).json({ error: prediction.detail || 'Failed to start prediction on Replicate.' });
        }

        // Poll prediction URL until finished
        const pollUrl = prediction.urls.get;

        while (prediction.status !== "succeeded" && prediction.status !== "failed") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const checkResponse = await fetch(pollUrl, {
                headers: {
                    "Authorization": authHeader,
                    "Content-Type": "application/json",
                },
            });
            prediction = await checkResponse.json();
        }

        if (prediction.status === "failed") {
            return res.status(500).json({ error: "Replicate image generation task failed." });
        }

        const imageUrl = prediction.output ? prediction.output[0] : null;

        if (!imageUrl) {
            return res.status(500).json({ error: "No image output returned." });
        }

        return res.status(200).json({
            success: true,
            imageUrl: imageUrl
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
