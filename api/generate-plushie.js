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

        // Expanded, explicit skin tone mapping for plushie fabric
        const selectedSkinTone = skinTone || 'medium brown caramel';

        // High-fidelity prompt targeting plushie fabric textures and precise skin tones
        let prompt = `A soft, cute 3D squishy plushie doll avatar of a character, professional studio lighting, macro photography. `;
        prompt += `Crafted from premium ultra-soft ${material || 'fleece'} and felt fabric, visible plush fabric fuzz and realistic texture, fine embroidered thread details along the seams. `;
        prompt += `The character's plushie face and skin fabric color is explicitly dyed a ${selectedSkinTone} tone. `;
        
        if (features && Array.isArray(features) && features.length > 0) {
            prompt += `Key facial and accessory details: ${features.join(', ')}. `;
        }
        
        prompt += `Large adorable embroidered button/dot eyes, a tiny stitched mouth, cute marshmallow proportions. `;
        prompt += `Set against a clean, soft-focus background in a ${scene || 'minimalist studio'}, beautifully lit with warm ambient light, depth of field, 8k resolution, product photography style. `;
        
        if (customNotes) {
            prompt += `Additional styling details: ${customNotes}. `;
        }

        // Run Flux Dev via Replicate SDK
        const output = await replicate.run(
            "black-forest-labs/flux-dev",
            {
                input: {
                    prompt: prompt,
                    num_outputs: 1,
                    aspect_ratio: "1:1",
                    output_format: "webp",
                    output_quality: 95,
                    guidance_scale: 3.5,
                    num_inference_steps: 28
                }
            }
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
