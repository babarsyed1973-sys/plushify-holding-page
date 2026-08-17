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

        const selectedSkinTone = skinTone || 'medium caramel brown skin tone';
        const selectedScene = scene || 'messy, cosy unmade bed surrounded by warm fairy lights';
        const selectedMaterial = material || 'ultra-soft fleece';

        // Strict design requirement prompt logic
        let prompt = `Ultra-soft, round, marshmallow-like giant squishy plushie stuffed toy doll. `;
        prompt += `Pastel ${selectedMaterial} version of full outfit, accessories, and hairstyle. `;
        prompt += `Plushie face is made of ${selectedSkinTone} fleece fabric. `;
        prompt += `Simple embroidered dot eyes and a tiny stitched smile. `;

        if (features && Array.isArray(features) && features.length > 0) {
            prompt += `Features: ${features.join(', ')}. `;
        }

        if (customNotes) {
            prompt += `Outfit & extra details: ${customNotes}. `;
        }

        prompt += `Plushie rests playfully on a ${selectedScene}. `;
        prompt += `Warm ambient glow, shallow depth of field, soft fabric textures, macro plush toy product photography. `;

        // Configure input payload for Flux Dev
        const inputPayload = {
            prompt: prompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 95,
            guidance_scale: 4.5,
            num_inference_steps: 30
        };

        // If reference image provided, pass it with balanced strength so it keeps likeness without ruining plushie style
        if (imageBase64) {
            inputPayload.image = imageBase64;
            inputPayload.prompt_strength = 0.48; // Preserves structure while forcing full plushie transformation
        }

        // Run Flux Dev
        const output = await replicate.run(
            "black-forest-labs/flux-dev",
            { input: inputPayload }
        );

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
