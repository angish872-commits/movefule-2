package com.movefuel.mufil2.ui.screens.cam

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun CAM011DetectedFoodReviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "CAM_011",
        title = "Detected Food Review",
        subtitle = "Food photo and gallery analysis with explicit review.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.CAM_012,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.CAM_010,
        onNavigate = onNavigate,
    ) {
            MFMediaPanel("Meal photo", "Review before creating canonical food facts.")
            MFListItem("Rice", "Estimated portion · editable", "Edit")
            MFListItem("Chicken", "Estimated portion · editable", "Edit")
            MFListItem("Vegetables", "Estimated portion · editable", "Edit")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun CAM011DetectedFoodReviewScreenPreview() {
    MoveFuelTheme { CAM011DetectedFoodReviewScreen {} }
}
