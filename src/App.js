import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import home from './pages/home';
import signin from './pages/signin';
import user from './pages/user';

function App() {  
  return (
    <Router>
    <div className="App">
      <navbar />
        <div className="content">
          <Switch>
            <Route exact path ="/">
              <home />
            </Route>
            <Route path = "/signin">
              <signin />
            </Route>
            <Route path ="*">
              <notFound />
            </Route>
          </Switch>
        </div>
    </div>
    </Router>
  );
}

export default App;
