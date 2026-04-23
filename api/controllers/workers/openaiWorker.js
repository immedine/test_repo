const { parentPort } = require("worker_threads");
const OpenAI = require("openai").default;

// IMPORTANT: no global.Promise override here

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

parentPort.on("message", async (job) => {
  try {
    const { imageUrl } = job;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini", // cheaper + good
      text: {
        format: {
          type: "json_object",
        },
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
                  Extract category wise menu from this image.

                  Rules:
                  - Group into categories
                  - create separate menu item with each price given
                  - Extract item name + price
                  - Fix spelling
                  - Normalize price to number
                  - Detect veg / non-veg
                  - generate 50 to 60 words description for each menu item if description is not present or if the description text is below 50 words. also keep the description if already there and add the rest to it to make it 50 to 60 words

                  Return STRICT JSON:
                  {
                    "categories": [
                      {
                        "name": "string",
                        "items": [
                          {
                            "name": "string",
                            "price": number,
                            "isVeg": boolean,
                            "description": "string"
                          }
                        ]
                      }
                    ]
                  }
            `,
            },
            {
              type: "input_image",
              image_url: imageUrl,
            },
          ],
        },
      ],
    });

    parentPort.postMessage({
      success: true,
      data: response.output_text,
    });
  } catch (err) {
    parentPort.postMessage({
      success: false,
      error: err.message,
    });
  }
});