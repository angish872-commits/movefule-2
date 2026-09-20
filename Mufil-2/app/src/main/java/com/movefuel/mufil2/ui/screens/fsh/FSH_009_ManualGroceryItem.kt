package com.movefuel.mufil2.ui.screens.fsh

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun FSH009ManualGroceryItemScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "FSH_009",
        title = "Manual Grocery Item",
        subtitle = "Shopping and pantry workflow.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.FSH_010,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.FSH_008,
        onNavigate = onNavigate,
    ) {
            MFField("Item name","")
            MFField("Quantity","1")
            MFField("Category","Grocery")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun FSH009ManualGroceryItemScreenPreview() {
    MoveFuelTheme { FSH009ManualGroceryItemScreen {} }
}
