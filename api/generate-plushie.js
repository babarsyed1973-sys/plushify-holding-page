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

        // Prompt tailored for transforming person into plushie format
        let prompt = `A custom squishy 3D plushie stuffed toy doll transformed from the reference person, soft fleece fabric texture, macro photograph. `;
        prompt += `The plushie doll features a ${selectedSkinTone} fabric face. `;
        prompt += `Crafted from high quality ${material || 'ultra-soft fleece'} with visible stitched seams and soft fabric fuzz. `;

        if (features && Array.isArray(features) && features.length > 0) {
            prompt += `Key facial traits and accessories: ${features.join(', ')}. `;
        }

        prompt += `Chubby marshmallow proportions, cute embroidered dot eyes, tiny stitched mouth, sitting comfortably in a ${scene || 'minimalist studio backdrop'}. `;
        prompt += `Warm ambient studio lighting, shallow depth of field, 8k resolution, product macro photography. `;

        if (customNotes) {
            prompt += `Outfit & extra details: ${customNotes}. `;
        }

        // Configure input payload for Flux Dev
        const inputPayload = {
            prompt: prompt,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 95,
            guidance_scale: 3.5,
            num_inference_steps: 28
        };

        // If reference image provided, pass it to preserve face/pose likeness
        if (imageBase64) {
            inputPayload.image = imageBase64;
            inputPayload.prompt_strength = 0.65; // High fidelity to source image
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
