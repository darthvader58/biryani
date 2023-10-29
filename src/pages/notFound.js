const notFound = () => {
    return ( 
        <div className="not-found">
            <h2>Sorry</h2>
            <p>Error 404, page cannot be found. </p>
            <Link to="/">Back to the home page</Link>
        </div>
     );
}
 
export default notFound;