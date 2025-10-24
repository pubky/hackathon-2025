import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { Layout } from './components/Layout';

const App = () => (
  <AuthProvider>
    <ProjectProvider>
      <Layout />
    </ProjectProvider>
  </AuthProvider>
);

export default App;
