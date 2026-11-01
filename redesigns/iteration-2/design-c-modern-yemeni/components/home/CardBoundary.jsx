'use client';
import {Component} from 'react';
export default class CardBoundary extends Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div role="status" className="card-failure"><p>تعذر عرض هذه البطاقة.</p><button onClick={()=>this.setState({failed:false})}>إعادة المحاولة</button></div>:this.props.children;}
}
