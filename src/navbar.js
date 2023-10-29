import { Link } from 'react-router-dom';

const navbar = () => {
    return ( 
        <nav className='navbar'>
            <div className='links'>
                <Link to= "/"> { logo }</Link>
                <Link to= "/signin"> Login/Signup</Link>
            </div>
        </nav>
     );
}
 
export default navbar;