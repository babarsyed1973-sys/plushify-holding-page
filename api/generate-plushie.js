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

        const replicate = new Replicate({ auth: apiToken });

        // Map selection explicitly to color values
        const skinToneMap = {
            'fair pale Caucasian skin tone': 'light fair peach skin color',
            'light beige Caucasian skin tone': 'light beige skin color',
            'warm tan olive skin tone': 'warm olive tan skin color',
            'medium caramel brown skin tone': 'caramel brown skin color',
            'deep rich brown skin tone': 'deep rich dark brown skin color',
            'dark black espresso skin tone': 'dark espresso black skin color'
        };

        const resolvedSkinTone = skinToneMap[skinTone] || skinTone || 'caramel brown skin color';
        const selectedScene = scene || 'messy, cosy unmade bed surrounded by warm fairy lights';
        const selectedMaterial = material || 'ultra-soft fleece';

        // High-weight prompt structure
        let prompt = `A soft, cute 3D squishy plushie doll avatar of the person in the reference photo. `;
        prompt += `Ultra-soft, round, marshmallow-like giant squishy plushie proportions. `;
        prompt += `Plushie head and skin fabric MUST be dyed ${resolvedSkinTone}. `;
        prompt += `Made from pastel ${selectedMaterial} fabric, with soft fabric fuzz and visible embroidered stitching. `;
        prompt += `Simple embroidered dot eyes and a tiny stitched smile. `;

        if (features && Array.isArray(features) && features.length > 0) {
            prompt += `Replicate exact facial features: ${features.join(', ')}. `;
        }

        if (customNotes) {
            prompt += `Outfit details matching photo: ${customNotes}. `;
        }

        prompt += `Plushie rests playfully on a ${selectedScene}. `;
        prompt += `Warm fairy light ambient glow, product macro photograph, 8k resolution.`;

        const inputPayload = {
            prompt: prompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 95,
            guidance_scale: 5.5, // Stronger prompt adherence
            num_inference_steps: 30
        };

        // Pass image if present with controlled image-to-image strength
        if (imageBase64) {
            inputPayload.image = imageBase64;
            inputPayload.prompt_strength = 0.38; // Sweet spot between likeness & plushie transformation
        }

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
