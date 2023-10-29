import { Select } from '@chakra-ui/react';
const Create = () => {
    return ( 
        <div className="create">
            <Select 
            placeholder='Homework'
            size = 'lg'
            icon={<MdArrowDropDown /> }
            border-radius = '6px'
            background = '#3A506B'
            // Homework
            color = '#5BC0BE'
            fontSize = '18'
            fontFamily = 'Inter'
            fontWeight = '400'
            lineHeight= '28'
            wordWrap = 'break-word'
            >
                <option value='option1'>Maths</option>
                <option value='option2'>Physics</option>
                <option value='option3'>Economics</option>
                <option value='option3'>Computer Science</option>
                <option value='option3'>Chemistry</option>
            </Select>
            <button></button>
        </div>
     );
}
 
export default Create;