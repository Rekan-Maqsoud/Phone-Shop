# Phone Shop Management System

An Electron-based desktop application for managing phone shop inventory, sales, and customer data with integrated cloud backup functionality.

## Features

### Core Features
- **Product Management**: Add, edit, delete, and archive products
- **Sales Management**: Process sales, track inventory, handle customer transactions
- **Debt Tracking**: Manage customer debts and payment tracking
- **Inventory Control**: Real-time stock tracking and low stock alerts
- **Multi-language Support**: English, Kurdish, and Arabic languages
- **Dark/Light Theme**: User preference based theming
- **Print Integration**: Receipt printing for sales

### Backup Features
- **Local Backup**: Create manual and automatic local database backups
- **Cloud Backup**: Secure cloud storage with user authentication
- **Backup Restoration**: Restore from both local and cloud backups
- **Backup History**: Track and manage backup versions
- **Auto Backup**: Scheduled automatic backups

## Technology Stack

- **Frontend**: React 18, Tailwind CSS, React Router DOM
- **Backend**: Electron, Node.js, SQLite (Better-SQLite3)
- **Cloud Services**: Appwrite (Authentication, Database, Storage)
- **Build Tools**: Vite, Electron Builder
- **Development**: ESLint, React DevTools

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "Phone Shop"
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   Copy `.env.example` to `.env` and configure your Appwrite settings:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Appwrite configuration:
   ```
   # Appwrite Configuration
   VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your-project-id
   VITE_APPWRITE_DATABASE_ID=your-database-id
   VITE_APPWRITE_BACKUPS_COLLECTION_ID=your-collection-id
   VITE_APPWRITE_BACKUP_BUCKET_ID=your-bucket-id
   ```
   
   **Note**: Cloud backup will use fallback values if environment variables are not set, but for production use, proper configuration is recommended.

4. Start development server:
```bash
npm run dev
```

This command will:
- Start the Vite development server
- Launch Electron in development mode
- Enable hot reloading for React components

## Building

### Build for current platform:
```bash
npm run build
npm run make
```

The built application will be available in the `dist` folder.

## Cloud Backup Setup

To enable cloud backup functionality, you need to configure Appwrite:

1. Follow the detailed setup guide in [CLOUD_BACKUP_SETUP.md](./CLOUD_BACKUP_SETUP.md)
2. Create an Appwrite project and configure authentication, database, and storage
3. Update your `.env` file with the Appwrite configuration
4. Test the cloud backup functionality

## Usage

### Admin Panel
- Access admin features with password authentication
- Manage products, view sales history, handle debts
- Configure settings and manage backups

### Cashier Interface
- Quick product lookup and sales processing
- Real-time inventory updates
- Receipt generation

### Backup Management
- **Local Backups**: Created in `Documents/Phone Shop Backups/`
- **Cloud Backups**: Stored securely in Appwrite storage
- **Auto Backup**: Configurable automatic backup scheduling

## File Structure

```
src/
├── components/          # Reusable React components
├── contexts/           # React contexts (Theme, Locale)
├── pages/              # Main application pages
├── services/           # External service integrations
├── assets/             # Static assets
├── main.cjs            # Electron main process
├── preload.js          # Electron preload script
└── App.jsx             # Main React application

database/
├── db.cjs              # Database connection and queries
└── shop.sqlite         # SQLite database file

public/                 # Public assets
scripts/                # Utility scripts
```

## Security Features

- **Context Isolation**: Secure IPC communication between main and renderer processes
- **CSP (Content Security Policy)**: Protection against XSS attacks
- **User Authentication**: Secure cloud backup access with Appwrite
- **Data Encryption**: Optional backup encryption
- **Permission System**: Role-based access control for cloud resources

## Localization

The application supports multiple languages:
- **English** (en)
- **Kurdish** (ku)
- **Arabic** (ar)

Language files are located in `src/contexts/LocaleContext.jsx`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure SQLite file permissions are correct
   - Check if database file exists in `database/` folder

2. **Cloud Backup Not Working**
   - Verify Appwrite configuration in `.env`
   - Check internet connection
   - Review Appwrite project permissions

3. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility

4. **Print Issues**
   - Verify printer drivers are installed
   - Check system print settings

### Getting Help

- Check the [Cloud Backup Setup Guide](./CLOUD_BACKUP_SETUP.md)
- Review Electron documentation
- Check Appwrite documentation for cloud features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Electron team for the desktop application framework
- React team for the UI library
- Appwrite team for backend services
- Tailwind CSS for styling utilities
