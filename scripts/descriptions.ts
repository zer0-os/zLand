import * as fs from 'fs';
import * as path from 'path';

// Define the district descriptions
const districtDescriptions: { [key: string]: string } = {
  "North Star": "North Star is located at the northernmost tip of the island in Wiami and is an upscale residential neighborhood. Known for its refined living and serene environment, it features elegant homes and high-end shops, offering a sophisticated lifestyle for its residents. This neighborhood combines exclusivity with convenience, providing a peaceful escape from the city while remaining connected to the vibrant culture of Wiami.",
  "Haven Heights": "Haven Heights is located between District Zero and Little Meow on the island of Wiami. It is a vibrant and multifaceted district that combines residential spaces with a variety of production and creative studios. This area is characterized by its blend of innovation and artistry, automotive dealerships, fashion studios and cutting-edge cybernetic production facilities. Heaven Heights is a hub for craftsmanship and technological advancement, supporting the development of advanced equipment and fostering a thriving community atmosphere.",
  "District ZERO": "District ZERO is located at the southernmost tip of the island of Wiami. It is a key industrial zone that specializes in transport, production and refining essential resources. This area is characterized by its warehouses and processing plants. Designed to support all production operations, playing a key role in the supply chain.",
  "Little Meow": "Little Meow is located in Wiami and is known for its grassroots movements and community-focused spirit. It serves as a recruitment and training ground for the Wilders, who resist the control of The Forum. This district is characterized by its futuristic stores specializing in training centers for combat and martial arts and racing garages. Little Meow is a hub for entertainment and tourism, featuring theaters, cafes, martial arts schools, and racing clubs, all contributing to its dynamic and rebellious atmosphere.",
  "Tranquility Gardens": "Tranquility Gardens is located above Little Meow on the island of Wiami. It is a serene and sustainable district that focuses on environmental harmony and self-sufficiency. This area is characterized by its vertical farms, lush green spaces, and innovative farm-to-table restaurants. Tranquility Gardens is a hub for sustainability, offering a variety of markets and vendors specializing in organic produce and eco-friendly products. The district serves as a peaceful retreat from the bustling industrial zones, emphasizing wellness and the preservation of natural resources.",
  "Space Mind": "Space Mind is located in Wiami and is focused on the fusion of advanced technology and spirituality. It serves as a hub for consciousness expansion, with residents exploring neural interfaces, consciousness mapping, and space-time manipulation. This district is characterized by its serene atmosphere and enigmatic energy, attracting those who seek to explore the mysteries of the cosmos. Known for its research into mind-machine integration and cosmic awareness, Space Mind offers a peaceful yet mysterious environment, making it a center for both technological innovation and spiritual growth.",
  "Nexus": "Nexus is the technological and crypto-financial hub of Wiami, known for its skyscrapers and cutting-edge innovations in blockchain, AI, and digital infrastructure. It houses data centers, research labs, and tech startups that fuel the city’s decentralized economy. This district serves as the control center for Wiami’s security and governance, managing network monitoring and infrastructure, making it a key player in shaping the city’s digital future.",
  "Flashing Lights": "Flashing Lights is a vibrant district in Wiami, known for its neon-lit streets, bustling nightlife, and immersive entertainment experiences. It is home to clubs, live music venues, and cutting-edge virtual reality shows that attract thrill-seekers and socialites. This district also features futuristic gaming arenas, e-sports venues, and high-stakes betting lounges where both physical and virtual competitions take place. With its fast-paced energy and nonstop activities, Flashing Lights is a central hub for entertainment and nightlife, capturing the pulse of Wiami’s dynamic social scene."
};

// Function to replace descriptions in the metadata
const replaceDescriptions = (metadataFile: any) => {
  metadataFile.nfts.forEach((nft: any) => {
    const currentDescription = nft.metadata.description;

    // Check for both correct names and typo versions
    for (const neighborhood in districtDescriptions) {
      if (currentDescription.includes(neighborhood) ||
          (neighborhood === "Space Mind" && currentDescription.includes("Space Ming")) ||
          (neighborhood === "Tranquility Gardens" && currentDescription.includes("Tranquility Garden"))) {
        nft.metadata.description = districtDescriptions[neighborhood];
        break;
      }
    }
  });

  return metadataFile;
};

// Read the metadata file
const metadataPath = path.join(__dirname, 'data', 'metadata.json');
fs.readFile(metadataPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading metadata file:', err);
    return;
  }

  let metadata;
  
  try {
    metadata = JSON.parse(data);
  } catch (parseError) {
    console.error('Error parsing metadata JSON:', parseError);
    return;
  }

  // Replace descriptions
  const updatedMetadata = replaceDescriptions(metadata);

  // Write the updated metadata back to the file
  fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing updated metadata file:', writeErr);
      return;
    }
    console.log('Metadata updated successfully!');
  });
});
