// data/mockData.js
export const mockData = {
  overview: {
    totalPests: 45,
    totalDiseases: 32,
    totalVarieties: 28,
    totalAdmins: 8,
    recentActivities: [
      { 
        id: 1, 
        action: "Added new pest record", 
        item: "Brown Planthopper", 
        time: "2 hours ago", 
        type: "pest",
        user: "Maria Santos"
      },
      { 
        id: 2, 
        action: "Updated rice variety", 
        item: "IR64 - Updated yield data", 
        time: "5 hours ago", 
        type: "variety",
        user: "Juan Dela Cruz"
      },
      { 
        id: 3, 
        action: "Deleted disease record", 
        item: "Obsolete Leaf Blight entry", 
        time: "1 day ago", 
        type: "disease",
        user: "Maria Santos"
      },
      { 
        id: 4, 
        action: "Created admin account", 
        item: "John Doe - Field Specialist", 
        time: "2 days ago", 
        type: "admin",
        user: "System Admin"
      },
      { 
        id: 5, 
        action: "Updated pest treatment", 
        item: "Stem Borer - New pesticide protocol", 
        time: "3 days ago", 
        type: "pest",
        user: "Dr. Santos"
      }
    ]
  },
  varieties: [
    { 
      id: 1, 
      name: "IR64", 
      breeder: "IRRI", 
      maturityDays: 115, 
      plantHeight: "90-100cm", 
      yield: "5-6 tons/ha", 
      environment: "Irrigated",
      description: "High-yielding variety with good disease resistance",
      dateAdded: "2024-01-15"
    },
    { 
      id: 2, 
      name: "PSB Rc82", 
      breeder: "PhilRice", 
      maturityDays: 120, 
      plantHeight: "95-105cm", 
      yield: "6-7 tons/ha", 
      environment: "Rainfed",
      description: "Drought-tolerant variety suitable for rainfed conditions",
      dateAdded: "2024-02-10"
    },
    { 
      id: 3, 
      name: "NSIC Rc222", 
      breeder: "PhilRice", 
      maturityDays: 110, 
      plantHeight: "85-95cm", 
      yield: "5.5-6.5 tons/ha", 
      environment: "Irrigated",
      description: "Early maturing variety with excellent grain quality",
      dateAdded: "2024-03-05"
    },
    { 
      id: 4, 
      name: "IR36", 
      breeder: "IRRI", 
      maturityDays: 125, 
      plantHeight: "100-110cm", 
      yield: "4-5 tons/ha", 
      environment: "Both",
      description: "Traditional variety with proven adaptability",
      dateAdded: "2024-01-20"
    }
  ],
  pests: [
    { 
      id: 1, 
      name: "Brown Planthopper", 
      scientific: "Nilaparvata lugens", 
      severity: "High", 
      symptoms: "Yellowing and browning of leaves, stunted growth, honeydew secretion", 
      cause: "Insect feeding on plant sap",
      treatment: "Insecticide application, resistant varieties, biological control",
      affectedStages: "Vegetative to reproductive",
      seasonality: "Wet season",
      dateAdded: "2024-01-10"
    },
    { 
      id: 2, 
      name: "Stem Borer", 
      scientific: "Scirpophaga incertulas", 
      severity: "Medium", 
      symptoms: "Dead hearts in vegetative stage, white heads in reproductive stage", 
      cause: "Larval boring into stems",
      treatment: "Pheromone traps, biological agents, proper timing of pesticides",
      affectedStages: "All growth stages",
      seasonality: "Dry season",
      dateAdded: "2024-02-05"
    },
    { 
      id: 3, 
      name: "Rice Bug", 
      scientific: "Leptocorisa oratorius", 
      severity: "Medium", 
      symptoms: "Unfilled grains, discolored grains, feeding marks on panicles", 
      cause: "Insect feeding on developing grains",
      treatment: "Insecticide spray during grain filling, field sanitation",
      affectedStages: "Reproductive stage",
      seasonality: "Both seasons",
      dateAdded: "2024-02-15"
    }
  ],
  diseases: [
    { 
      id: 1, 
      name: "Rice Blast", 
      cause: "Pyricularia oryzae", 
      severity: "High", 
      symptoms: "Diamond-shaped lesions with gray centers and brown margins", 
      treatment: "Fungicide application, resistant varieties, balanced fertilization",
      affectedParts: "Leaves, neck, panicles",
      conditions: "High humidity, cool temperatures",
      dateAdded: "2024-01-08"
    },
    { 
      id: 2, 
      name: "Bacterial Leaf Blight", 
      cause: "Xanthomonas oryzae pv. oryzae", 
      severity: "High", 
      symptoms: "Water-soaked lesions that turn yellow, wilting of leaves", 
      treatment: "Copper-based bactericide, resistant varieties, crop rotation",
      affectedParts: "Leaves, leaf sheaths",
      conditions: "High temperature and humidity",
      dateAdded: "2024-01-12"
    },
    { 
      id: 3, 
      name: "Sheath Blight", 
      cause: "Rhizoctonia solani", 
      severity: "Medium", 
      symptoms: "Oval lesions with brown margins on leaf sheaths", 
      treatment: "Fungicide spray, field sanitation, avoid excessive nitrogen",
      affectedParts: "Leaf sheaths, stems",
      conditions: "High humidity, dense planting",
      dateAdded: "2024-02-20"
    }
  ],
  admins: [
    { 
      id: 1, 
      name: "Maria Santos", 
      email: "maria.santos@admin.com", 
      role: "Super Admin", 
      status: "Active", 
      lastLogin: "Today, 9:30 AM",
      dateCreated: "2023-12-01",
      permissions: ["All Access"],
      department: "System Administration"
    },
    { 
      id: 2, 
      name: "Juan Dela Cruz", 
      email: "juan.delacruz@admin.com", 
      role: "Admin", 
      status: "Active", 
      lastLogin: "Yesterday, 4:15 PM",
      dateCreated: "2024-01-15",
      permissions: ["Rice Varieties", "Pest Management", "Disease Management"],
      department: "Agricultural Research"
    },
    { 
      id: 3, 
      name: "Dr. Ana Reyes", 
      email: "ana.reyes@admin.com", 
      role: "Specialist", 
      status: "Active", 
      lastLogin: "2 days ago",
      dateCreated: "2024-02-01",
      permissions: ["Pest Management", "Disease Management"],
      department: "Plant Pathology"
    },
    { 
      id: 4, 
      name: "Roberto Garcia", 
      email: "roberto.garcia@admin.com", 
      role: "Admin", 
      status: "Inactive", 
      lastLogin: "1 week ago",
      dateCreated: "2023-11-10",
      permissions: ["Rice Varieties"],
      department: "Crop Science"
    }
  ]
};