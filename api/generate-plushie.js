import Replicate from "replicate";

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

        const apiToken = rawToken.replace(/^(Bearer|Token)\s+/i, '');

        const replicate = new Replicate({
            auth: apiToken,
        });

        // Construct plushie prompt
        let prompt = `Ultra-soft, round, marshmallow-like giant squishy plushie avatar toy. `;
        prompt += `Made of ${material || 'ultra-soft fleece'} material. `;
        prompt += `Skin tone: ${skinTone || 'medium'}. `;
        
        if (features && Array.isArray(features) && features.length > 0) {
            prompt += `Features: ${features.join(', ')}. `;
        }
        
        prompt += `Simple embroidered dot eyes and a tiny stitched smile. `;
        prompt += `Setting: ${scene || 'minimalist studio'}. `;
        
        if (customNotes) {
            prompt += `Additional detail: ${customNotes}. `;
        }

        // Run Flux-schnell (no 64-char hash needed!)
        const output = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
                input: {
                    prompt: prompt,
                    num_outputs: 1,
                    aspect_ratio: "1:1",
                    output_format: "webp",
                    output_quality: 80
                }
            }
        );

        // Convert output stream or array to URL string
        let imageUrl = Array.isArray(output) ? output[0] : output;
        
        if (imageUrl && typeof imageUrl === 'object' && typeof imageUrl.url === 'function') {
            imageUrl = imageUrl.url().href;
        } else if (imageUrl && typeof imageUrl === 'object' && imageUrl.href) {
            imageUrl = imageUrl.href;
        } else {
            imageUrl = String(imageUrl);
        }

        if (!imageUrl) {
            return res.status(500).json({ error: "No image output returned from Replicate." });
        }

        return res.status(200).json({
            success: true,
            imageUrl: imageUrl
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
